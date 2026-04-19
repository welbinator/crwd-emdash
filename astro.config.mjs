import node from "@astrojs/node";
import react from "@astrojs/react";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { webhookNotifierPlugin } from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

export default defineConfig({
	output: "server",
	devToolbar: { enabled: false },
	adapter: node({ mode: "standalone" }),
	security: {
		checkOrigin: false,
		allowedDomains: [
			{ hostname: "cedarrapidswebdesign.com", protocol: "https" },
			{ hostname: "www.cedarrapidswebdesign.com", protocol: "https" },
		],
	},
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			routes: [formsPlugin(), webhookNotifierPlugin()],
		}),
	],
});
