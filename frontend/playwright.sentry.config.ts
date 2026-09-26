import { defineConfig } from '@playwright/test';

import { createPlaywrightConfig } from './playwright.config';

export default defineConfig({
	...createPlaywrightConfig({ reuseExistingServer: false, serverCommand: 'pnpm start' }),
	testDir: './src/test/sentry-e2e',
	testMatch: 'sentry-network-failure.spec.ts',
	use: {
		baseURL: 'http://localhost:3107',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'pnpm build && pnpm start --port 3107',
		url: 'http://localhost:3107/about',
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:9',
			NEXT_PUBLIC_DEV_MASTER_TOKEN: '',
			NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: '',
			NEXT_PUBLIC_SENTRY_DSN: 'https://00000000000000000000000000000000@o0.ingest.sentry.io/0',
			NEXT_PUBLIC_SENTRY_ENABLED: 'true',
			SENTRY_AUTH_TOKEN: '',
		},
	},
});
