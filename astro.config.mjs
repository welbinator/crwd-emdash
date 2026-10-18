import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { brevoEmail } from "./src/plugins/brevo-email/index.ts";

export default defineConfig({
	output: "server",
	site: "https://cedarrapidswebdesign.com",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			siteUrl: "https://cedarrapidswebdesign.com",
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [
				brevoEmail({
					from: { email: "james@cedarrapidswebdesign.com", name: "Cedar Rapids Web Design" },
					replyTo: "james@cedarrapidswebdesign.com",
				}),
				formsPlugin({
					defaultSpamProtection: "honeypot",
				}),
			],
		}),
	],
	devToolbar: { enabled: false },
});
