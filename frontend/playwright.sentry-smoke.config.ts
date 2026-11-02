import { defineConfig, devices } from '@playwright/test';

import { resolveSentrySmokeConfig } from './test-harness/sentry-smoke-config.mjs';

const { dsn: sentryDsn } = resolveSentrySmokeConfig(process.env);
const isProductionSmoke = process.env.SENTRY_SMOKE_PRODUCTION === 'true';
const isPostHogReplaySmoke = process.env.POSTHOG_REPLAY_SMOKE === 'true';

export default defineConfig({
	testDir: './src/test/sentry-e2e',
	testMatch: /sentry-(feed|post)-503\.spec\.ts/,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 90_000,
	use: {
		baseURL: 'http://127.0.0.1:3109',
		bypassCSP: process.env.SENTRY_SMOKE_BYPASS_CSP === 'true',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
	webServer: {
		command: `pnpm ${isProductionSmoke ? 'start' : 'dev'} --hostname 127.0.0.1 --port 3109`,
		url: 'http://127.0.0.1:3109/about',
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			SENTRY_FEED_503_SMOKE: 'true',
			NEXT_PUBLIC_API_BASE_URL: 'https://api.rilog.test',
			NEXT_PUBLIC_DEV_MASTER_TOKEN: '',
			NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: isPostHogReplaySmoke
				? (process.env.SENTRY_SMOKE_POSTHOG_PROJECT_TOKEN ?? '')
				: '',
			NEXT_PUBLIC_POSTHOG_HOST: isPostHogReplaySmoke ? (process.env.SENTRY_SMOKE_POSTHOG_HOST ?? '') : '',
			NEXT_PUBLIC_POSTHOG_OPT_OUT_USERAGENT_FILTER: isPostHogReplaySmoke ? 'true' : 'false',
			NEXT_PUBLIC_SENTRY_DSN: sentryDsn,
			NEXT_PUBLIC_SENTRY_ENABLED: 'true',
			NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'smoke',
			SENTRY_SLACK_BOT_TOKEN: '',
			SENTRY_SLACK_CHANNEL_ID: '',
			SENTRY_SLACK_WEBHOOK_URL: '',
			SENTRY_AUTH_TOKEN: '',
		},
	},
});
