/**
 * Brevo email env helper.
 *
 * Hooks run without request context, so the Worker secret (BREVO_API_KEY)
 * can't come from Astro.locals.runtime. The `cloudflare:workers` module
 * exposes the same env to any code bundled into the Worker. Imported through
 * this dedicated helper so the built-in module is referenced via a static
 * import, matching the canonical @emdash-cms/cloudflare provider pattern.
 */
export { env } from "cloudflare:workers";
