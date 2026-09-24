import { defineConfig, devices } from '@playwright/test';

import type { ReporterDescription } from '@playwright/test';

interface PlaywrightConfigOptions {
	reporters?: ReporterDescription[];
	reuseExistingServer: boolean;
	serverCommand: string;
}

export const createPlaywrightReporters = (): ReporterDescription[] => [
	[process.env.CI ? 'github' : 'list'],
	['html', { open: 'never', outputFolder: 'playwright-report' }],
	['json', { outputFile: 'test-results/results.json' }],
];

export const createPlaywrightConfig = ({ reporters, reuseExistingServer, serverCommand }: PlaywrightConfigOptions) =>
	defineConfig({
		testDir: './src/test/e2e',
		fullyParallel: false,
		workers: 1,
		retries: 0,
		forbidOnly: Boolean(process.env.CI),
		reporter: reporters ?? createPlaywrightReporters(),
		use: {
			baseURL: 'http://localhost:3000',
			screenshot: 'only-on-failure',
			trace: 'retain-on-failure',
		},
		webServer: {
			command: serverCommand,
			url: 'http://localhost:3000',
			reuseExistingServer,
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

export default createPlaywrightConfig({
	reuseExistingServer: !process.env.CI,
	serverCommand: 'pnpm dev',
});
