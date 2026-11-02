// Validate only public configuration. Never log DSNs or authentication values.
if (process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT !== 'prod') {
	throw new Error('Production deployment requires NEXT_PUBLIC_SENTRY_ENVIRONMENT=prod.');
}
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
if (!URL.canParse(siteUrl) || new URL(siteUrl).origin !== 'https://www.rilog.kr') {
	throw new Error('Production deployment requires the canonical HTTPS site URL.');
}
if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'false' && !process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
	throw new Error('Production Sentry capture requires a DSN or an explicit disable flag.');
}
