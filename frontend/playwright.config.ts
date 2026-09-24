import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './src/test/e2e',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		env: {
			NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:9',
			NEXT_PUBLIC_DEV_MASTER_TOKEN: '',
			NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: '',
		},
	},
	projects: [
		{
			name: 'chromium',
			use: devices['Desktop Chrome'],
		},
	],
});
