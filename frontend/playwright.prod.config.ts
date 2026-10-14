import type { ReporterDescription } from '@playwright/test';

import { createPlaywrightConfig, createPlaywrightReporters } from './playwright.config';

const productionReporters: ReporterDescription[] = [
	['./test-harness/required-e2e-flow-reporter.ts'],
	...createPlaywrightReporters(),
];

const config = {
	...createPlaywrightConfig({
		reporters: productionReporters,
		reuseExistingServer: false,
		serverCommand: 'pnpm start',
	}),
	testIgnore: [],
};

export default config;
