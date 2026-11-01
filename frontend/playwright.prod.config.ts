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

const projects = baseConfig.projects;
if (!projects?.length) throw new Error('Production E2E projects are required.');

const isrTest = '**/the-rilog-isr.prod.spec.ts';
const statefulTests = ['**/post-detail-regressions.spec.ts', '**/post-views.spec.ts'];
const config = {
	...baseConfig,
	workers: 2,
	testIgnore: [],
	projects: [
		...projects.map((project) => ({ ...project, testIgnore: [isrTest, ...statefulTests] })),
		{
			name: 'chromium-server-state',
			use: projects[0].use,
			testMatch: statefulTests,
			workers: 1,
			dependencies: projects.map((project) => project.name),
		},
		{
			name: 'chromium-isr',
			use: projects[0].use,
			testMatch: isrTest,
			dependencies: ['chromium-server-state'],
		},
	],
};

export default config;
