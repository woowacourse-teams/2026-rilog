import { defineConfig } from '@playwright/test';

import config from './playwright.prod.config';

export default defineConfig({
	reporter: [
		[
			'./test-harness/required-e2e-flow-reporter.ts',
			{
				expectedProjects: config.projects?.map((project) => project.name),
				resultFile: 'test-results/e2e-validation.json',
			},
		],
		['html', { open: 'never', outputFolder: 'playwright-report' }],
		['json', { outputFile: 'test-results/results.json' }],
	],
});
