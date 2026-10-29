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

export const createPlaywrightConfig = ({ reporters, reuseExistingServer, serverCommand }: PlaywrightConfigOptions) => {
	const port = Number(process.env.PLAYWRIGHT_PORT ?? '3000');
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PLAYWRIGHT_PORT must be a valid port.');
	const serverUrl = `http://localhost:${port}`;
	return defineConfig({
		testDir: './src/test/e2e',
		testIgnore: '**/*.prod.spec.ts',
		fullyParallel: false,
		workers: 1,
		retries: 0,
		forbidOnly: Boolean(process.env.CI),
		reporter: reporters ?? createPlaywrightReporters(),
		use: {
			baseURL: serverUrl,
			screenshot: 'only-on-failure',
			trace: 'retain-on-failure',
		},
		webServer: {
			command: `${serverCommand} --port ${port}`,
			url: serverUrl,
			reuseExistingServer,
			env: {
				NEXT_PUBLIC_API_BASE_URL: 'https://api.rilog.test',
				NEXT_PUBLIC_DEV_MASTER_TOKEN: '',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: '',
				NEXT_PUBLIC_SENTRY_DSN: '',
				NEXT_PUBLIC_SENTRY_ENABLED: 'false',
				SENTRY_SLACK_BOT_TOKEN: '',
				SENTRY_SLACK_CHANNEL_ID: '',
				SENTRY_SLACK_WEBHOOK_URL: '',
				NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=./test-harness/the-rilog-server-fixture.mjs`.trim(),
				THE_RILOG_ALLOW_FIXTURE: 'true',
				THE_RILOG_SNAPSHOT_PATH: '.the-rilog-build/fixture.json',
				THE_RILOG_REVALIDATION_SECRET: 'playwright-local-refresh-secret',
				THE_RILOG_SERVER_FIXTURE_STATE_PATH: '.the-rilog-build/server-fixture-state.json',
				THE_RILOG_SERVER_FIXTURE_REQUEST_LOG: '.the-rilog-build/server-fixture-requests.log',
				THE_RILOG_SERVER_FIXTURE_HTTP_LOG: '.the-rilog-build/server-fixture-http.log',
			},
		},
		projects: [
			{
				name: 'chromium',
				use: devices['Desktop Chrome'],
			},
			{
				name: 'webkit-comments',
				testMatch: [
					'**/mobile-comment-interaction.spec.ts',
					'**/inline-comment-scroll-unlock.spec.ts',
					'**/inline-comment-anchor-navigation.spec.ts',
					'**/pc-inline-comment-selection.spec.ts',
					'**/comment-sheet-gestures.spec.ts',
				],
				use: { ...devices['Desktop Safari'], hasTouch: true },
			},
			{
				name: 'firefox-comments',
				testMatch: [
					'**/mobile-comment-interaction.spec.ts',
					'**/inline-comment-scroll-unlock.spec.ts',
					'**/inline-comment-anchor-navigation.spec.ts',
					'**/pc-inline-comment-selection.spec.ts',
					'**/comment-sheet-gestures.spec.ts',
				],
				use: devices['Desktop Firefox'],
			},
		],
	});
};

export default createPlaywrightConfig({
	reuseExistingServer: false,
	serverCommand: 'node scripts/create-the-rilog-fixture.mjs && pnpm prepare:the-rilog && pnpm dev',
});
