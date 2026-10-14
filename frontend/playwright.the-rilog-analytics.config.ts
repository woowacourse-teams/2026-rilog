import { defineConfig } from '@playwright/test';

import { createPlaywrightConfig } from './playwright.config';

const baseConfig = createPlaywrightConfig({
	reuseExistingServer: false,
	serverCommand: 'pnpm start',
});
const webServer = baseConfig.webServer;
if (webServer === undefined || Array.isArray(webServer)) throw new Error('A single test server is required.');

export default defineConfig({
	...baseConfig,
	testDir: './src/test/the-rilog-analytics-browser',
	testMatch: '**/*.spec.ts',
	testIgnore: '**/*.prod.spec.ts',
	webServer: {
		...webServer,
		env: {
			...webServer.env,
			NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_playwright_local',
			NEXT_PUBLIC_POSTHOG_OPT_OUT_USERAGENT_FILTER: 'true',
			NEXT_PUBLIC_POSTHOG_HOST: 'https://posthog.rilog.test',
		},
	},
});
