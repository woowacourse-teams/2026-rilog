import type { ReporterDescription } from '@playwright/test';

import { createPlaywrightConfig, createPlaywrightReporters } from './playwright.config';

const productionReporters: ReporterDescription[] = [
	['./test-harness/required-e2e-flow-reporter.ts'],
	...createPlaywrightReporters(),
];

const baseConfig = createPlaywrightConfig({
	reporters: productionReporters,
	reuseExistingServer: false,
	serverCommand: 'pnpm start',
});

const isrTest = '**/the-rilog-isr.prod.spec.ts';
const statefulTests = ['**/post-detail-regressions.spec.ts', '**/post-views.spec.ts'];
const config = {
	...baseConfig,
	workers: 2,
	testIgnore: [],
	projects: [
		...baseConfig.projects.map((project) => ({ ...project, testIgnore: [isrTest, ...statefulTests] })),
		{
			name: 'chromium-server-state',
			use: baseConfig.projects[0].use,
			testMatch: statefulTests,
			workers: 1,
			dependencies: baseConfig.projects.map((project) => project.name),
		},
		{
			name: 'chromium-isr',
			use: baseConfig.projects[0].use,
			testMatch: isrTest,
			dependencies: ['chromium-server-state'],
		},
	],
};

export default config;
