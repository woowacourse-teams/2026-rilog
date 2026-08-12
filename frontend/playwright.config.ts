import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './src/test/e2e',
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
	},
	projects: [
		{
			name: 'chromium',
			use: devices['Desktop Chrome'],
		},
	],
});
