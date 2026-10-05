import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const dsn = process.env.SENTRY_SMOKE_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!process.env.SENTRY_AUTH_TOKEN || !dsn) {
	console.error('SENTRY_AUTH_TOKEN and SENTRY_SMOKE_DSN or NEXT_PUBLIC_SENTRY_DSN are required in .env.');
	process.exit(1);
}

if (process.env.SENTRY_SMOKE_DRY_RUN === 'true') {
	console.error('The production source map smoke test requires real Sentry delivery.');
	process.exit(1);
}

const git = spawnSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' });
if (git.status !== 0) {
	console.error('Could not determine the Git commit for the Sentry release.');
	process.exit(1);
}

const release = `sourcemap-smoke-${git.stdout.trim()}-${Date.now()}`;
const env = {
	...process.env,
	SENTRY_RELEASE: release,
	SENTRY_SMOKE_DSN: dsn,
	SENTRY_FEED_503_SMOKE: 'true',
	SENTRY_UPLOAD_REQUIRED: 'true',
	SENTRY_SMOKE_PRODUCTION: 'true',
	NEXT_PUBLIC_API_BASE_URL: 'https://api.rilog.test',
	NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3109',
	NEXT_PUBLIC_DEV_MASTER_TOKEN: '',
	NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: '',
	NEXT_PUBLIC_SENTRY_DSN: dsn,
	NEXT_PUBLIC_SENTRY_ENABLED: 'true',
};

function run(command, args) {
	const result = spawnSync(command, args, { env, stdio: 'inherit' });
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	if (result.status !== 0) process.exit(result.status ?? 1);
}

console.info(`Building and uploading source maps for release ${release}`);
run('pnpm', ['build']);

if (!existsSync('.next-sentry-feed-503/BUILD_ID')) {
	console.error('The production smoke build did not produce a BUILD_ID.');
	process.exit(1);
}

run('pnpm', ['test:sentry:post-503']);

const issuesUrl = new URL('https://rilog-fontend.sentry.io/issues/');
issuesUrl.searchParams.set('environment', 'prod');
issuesUrl.searchParams.set('project', new URL(dsn).pathname.replaceAll('/', ''));
issuesUrl.searchParams.set('statsPeriod', '24h');
console.info(`Sentry prod issues: ${issuesUrl}`);
console.info(`Find release ${release} and request_id sentry-smoke-post-503.`);
