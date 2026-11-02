const PRODUCTION_PROJECT_ID = '4512133995429888';
const PRODUCTION_PROJECT_SLUG = 'rilog-frontend-nextjs';

/** @param {Record<string, string | undefined>} env */
export function resolveSentrySmokeConfig(env) {
	const dsn = env.SENTRY_SMOKE_DSN;
	let parsed;
	try {
		parsed = new URL(dsn ?? '');
	} catch {
		throw new Error('A dedicated, valid SENTRY_SMOKE_DSN is required.');
	}
	if (
		parsed.protocol !== 'https:' ||
		!parsed.username ||
		parsed.password ||
		parsed.search ||
		parsed.hash ||
		!/^\/[1-9]\d*\/?$/.test(parsed.pathname)
	)
		throw new Error('SENTRY_SMOKE_DSN must be an HTTPS project DSN without extra credentials or query data.');
	const projectId = parsed.pathname.replaceAll('/', '');
	const org = env.SENTRY_SMOKE_ORG;
	const project = env.SENTRY_SMOKE_PROJECT_SLUG;
	if (projectId === PRODUCTION_PROJECT_ID || project?.toLowerCase() === PRODUCTION_PROJECT_SLUG) {
		throw new Error('Sentry smoke must not target the production project.');
	}
	if (projectId !== env.SENTRY_SMOKE_PROJECT_ID) {
		throw new Error('SENTRY_SMOKE_PROJECT_ID must explicitly match the dedicated smoke DSN.');
	}
	if (!org || !project || !/^[a-z0-9_-]+$/i.test(org) || !/^[a-z0-9_-]+$/i.test(project)) {
		throw new Error('SENTRY_SMOKE_ORG and SENTRY_SMOKE_PROJECT_SLUG must identify the dedicated upload target.');
	}
	return { dsn: parsed.toString(), projectId, org, project };
}
