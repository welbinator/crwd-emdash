/**
 * Brevo Email Provider Plugin for EmDash
 *
 * Delivers EmDash emails (form notifications, autoresponders, magic-link
 * logins, invites) through Brevo's transactional email API.
 * Registers `email:deliver` as an exclusive hook — activate the plugin,
 * then select it as the provider under Settings -> Email.
 *
 * The BREVO_API_KEY is read from a Worker secret at delivery time. Sender
 * and reply-to are passed via plugin options in astro.config.mjs.
 */

import type { PluginContext, PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";
import type { EmailDeliverEvent } from "emdash/plugin";

export interface BrevoEmailConfig {
	/** Sender address. Must be a verified sender/domain in Brevo. */
	from: string | { email: string; name?: string };
	/** Optional Reply-To. A message's own replyTo takes precedence. */
	replyTo?: string;
	/** Name of the Worker secret holding the Brevo API key. @default "BREVO_API_KEY" */
	apiKeyBinding?: string;
}

async function loadWorkerEnv(): Promise<Record<string, unknown>> {
	try {
		const { env } = await import("./env.js");
		return env as unknown as Record<string, unknown>;
	} catch {
		throw new Error(
			"[brevo-email] cloudflare:workers is not available — this provider " +
				"only runs on the Cloudflare Workers runtime (deployed or via astro dev " +
				"with the Cloudflare adapter).",
		);
	}
}

export function createBrevoEmailDeliver(
	config: BrevoEmailConfig,
	loadEnv: () => Promise<Record<string, unknown>> = loadWorkerEnv,
): (event: EmailDeliverEvent, ctx: PluginContext) => Promise<void> {
	const from = typeof config.from === "string" ? { email: config.from } : config.from;
	const keyBinding = config.apiKeyBinding ?? "BREVO_API_KEY";

	return async (event, ctx) => {
		const { message } = event;
		const env = await loadEnv();
		const apiKey = env[keyBinding] as string | undefined;
		if (!apiKey) {
			throw new Error(
				`[brevo-email] Worker secret "${keyBinding}" not found — set it with ` +
					`\`wrangler secret put ${keyBinding}\`.`,
			);
		}
		if (!ctx.http) {
			throw new Error("[brevo-email] network:request capability (ctx.http) unavailable.");
		}

		const replyTo = message.replyTo ?? config.replyTo;
		const payload: Record<string, unknown> = {
			sender: from,
			to: [{ email: message.to }],
			subject: message.subject,
			textContent: message.text,
			...(message.html ? { htmlContent: message.html } : {}),
			...(message.cc?.length ? { cc: message.cc.map((email) => ({ email })) } : {}),
			...(replyTo ? { replyTo: { email: replyTo } } : {}),
		};

		const response = await ctx.http.fetch("https://api.brevo.com/v3/smtp/email", {
			method: "POST",
			headers: {
				"api-key": apiKey,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new Error(
				`[brevo-email] Brevo API returned ${response.status}: ${body.slice(0, 500)}`,
			);
		}

		const result = (await response.json().catch(() => ({}))) as { messageId?: string };
		ctx.log.info("email delivered via Brevo", {
			to: message.to,
			subject: message.subject,
			messageId: result?.messageId,
		});
	};
}

function assertValidFrom(config: BrevoEmailConfig): void {
	const fromEmail = typeof config.from === "string" ? config.from : config.from?.email;
	if (!fromEmail || !fromEmail.includes("@")) {
		throw new Error(
			'[brevo-email] config.from is required (e.g. { from: "noreply@example.com" }) — ' +
				"Brevo rejects messages without a verified sender address.",
		);
	}
}

/** Called by the generated virtual:emdash/plugins module with the descriptor options. */
export function createPlugin(config: BrevoEmailConfig): ResolvedPlugin {
	assertValidFrom(config);
	return definePlugin({
		id: "brevo-email",
		version: "1.0.0",
		capabilities: ["hooks.email-transport:register", "network:request"],
		allowedHosts: ["api.brevo.com"],
		hooks: {
			"email:deliver": {
				exclusive: true,
				handler: createBrevoEmailDeliver(config),
			},
		},
	});
}

/** Descriptor for the emdash() integration's plugins array. */
export function brevoEmail(config: BrevoEmailConfig): PluginDescriptor<BrevoEmailConfig> {
	assertValidFrom(config);
	return {
		id: "brevo-email",
		version: "1.0.0",
		entrypoint: new URL("./index.ts", import.meta.url).href,
		format: "native",
		options: config,
		capabilities: ["hooks.email-transport:register", "network:request"],
	};
}

export default brevoEmail;
