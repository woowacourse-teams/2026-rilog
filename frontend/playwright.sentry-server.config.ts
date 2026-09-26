import { defineConfig } from '@playwright/test';

import { createPlaywrightConfig } from './playwright.config';

export default defineConfig({
	...createPlaywrightConfig({ reuseExistingServer: false, serverCommand: 'pnpm start' }),
	testDir: './src/test/sentry-e2e',
	testMatch: 'sentry-server-network-failure.spec.ts',
	use: {
		baseURL: 'http://localhost:3107',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: [
		{
			command: 'node test-harness/sentry-failure-server.ts',
			url: 'http://127.0.0.1:3108/health',
			reuseExistingServer: false,
		},
		{
			command: 'pnpm build && pnpm start --port 3107',
			url: 'http://localhost:3107/about',
			reuseExistingServer: false,
			timeout: 120_000,
			env: {
				NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:9',
				NEXT_PUBLIC_DEV_MASTER_TOKEN: '',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: '',
				NEXT_PUBLIC_SENTRY_DSN: 'http://public@127.0.0.1:3108/1',
				NEXT_PUBLIC_SENTRY_ENABLED: 'true',
				SENTRY_AUTH_TOKEN: '',
			},
		},
	],
});
