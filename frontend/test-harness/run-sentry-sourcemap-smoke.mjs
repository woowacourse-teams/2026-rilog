import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

import { resolveSentrySmokeConfig } from './sentry-smoke-config.mjs';

const { dsn, projectId, org, project } = resolveSentrySmokeConfig(process.env);
const isPostHogReplaySmoke = process.argv.includes('--posthog-replay');

if (!process.env.SENTRY_AUTH_TOKEN) {
	console.error('SENTRY_AUTH_TOKEN for the dedicated smoke upload target is required.');
	process.exit(1);
}

if (process.env.SENTRY_SMOKE_DRY_RUN === 'true') {
	console.error('The production source map smoke test requires real Sentry delivery.');
	process.exit(1);
}

if (
	isPostHogReplaySmoke &&
	(!process.env.SENTRY_SMOKE_POSTHOG_PROJECT_TOKEN || !process.env.SENTRY_SMOKE_POSTHOG_HOST)
) {
	console.error(
		'The replay smoke requires SENTRY_SMOKE_POSTHOG_PROJECT_TOKEN and SENTRY_SMOKE_POSTHOG_HOST for a test project.',
	);
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
	SENTRY_SMOKE_PROJECT_ID: projectId,
	SENTRY_SMOKE_ORG: org,
	SENTRY_SMOKE_PROJECT_SLUG: project,
	SENTRY_SLACK_BOT_TOKEN: '',
	SENTRY_SLACK_CHANNEL_ID: '',
	SENTRY_SLACK_WEBHOOK_URL: '',
	SENTRY_FEED_503_SMOKE: 'true',
	SENTRY_UPLOAD_REQUIRED: 'true',
	SENTRY_SMOKE_PRODUCTION: 'true',
	POSTHOG_REPLAY_SMOKE: isPostHogReplaySmoke ? 'true' : 'false',
	NEXT_PUBLIC_API_BASE_URL: 'https://api.rilog.test',
	NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3109',
	NEXT_PUBLIC_DEV_MASTER_TOKEN: '',
	NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: isPostHogReplaySmoke ? process.env.SENTRY_SMOKE_POSTHOG_PROJECT_TOKEN : '',
	NEXT_PUBLIC_POSTHOG_HOST: isPostHogReplaySmoke ? process.env.SENTRY_SMOKE_POSTHOG_HOST : '',
	NEXT_PUBLIC_POSTHOG_OPT_OUT_USERAGENT_FILTER: isPostHogReplaySmoke ? 'true' : 'false',
	NEXT_PUBLIC_SENTRY_DSN: dsn,
	NEXT_PUBLIC_SENTRY_ENABLED: 'true',
	NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'smoke',
	THE_RILOG_SNAPSHOT_PATH: '.the-rilog-build/fixture.json',
	THE_RILOG_ALLOW_FIXTURE: 'true',
};

function run(command, args) {
	const result = spawnSync(command, args, { env, stdio: 'inherit' });
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	if (result.status !== 0) process.exit(result.status ?? 1);
}

console.info(
	`Building and uploading source maps for release ${release}${isPostHogReplaySmoke ? ' with PostHog replay' : ''}`,
);
run(process.execPath, ['scripts/create-the-rilog-fixture.mjs']);
run('pnpm', ['prepare:the-rilog']);
run('pnpm', ['build']);

if (!existsSync('.next-sentry-feed-503/BUILD_ID')) {
	console.error('The production smoke build did not produce a BUILD_ID.');
	process.exit(1);
}

run('pnpm', ['test:sentry:post-503']);

const issuesUrl = new URL(`https://${org}.sentry.io/issues/`);
issuesUrl.searchParams.set('environment', 'smoke');
issuesUrl.searchParams.set('project', projectId);
issuesUrl.searchParams.set('statsPeriod', '24h');
console.info(`Sentry smoke issues: ${issuesUrl}`);
console.info(`Find release ${release} and request_id sentry-smoke-post-503.`);
