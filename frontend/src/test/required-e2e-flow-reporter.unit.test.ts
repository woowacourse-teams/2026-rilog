import { expect, it, vi } from 'vitest';

import type { FullConfig, Suite, TestCase, TestResult } from '@playwright/test/reporter';

import { REQUIRED_E2E_FLOW_TAGS } from '@/test/e2e/required-flows';

import RequiredE2eFlowReporter from '../../test-harness/required-e2e-flow-reporter';

it.each(['complete', 'missing', 'duplicate', 'skip', 'failure', 'not-run'])(
	'전체 E2E의 필수 흐름 판정을 보호한다: %s',
	async (scenario) => {
		const reporter = new RequiredE2eFlowReporter();
		const tags = Object.values(REQUIRED_E2E_FLOW_TAGS);
		const tests = tags.map((tag, index) => ({
			tags: [tag],
			expectedStatus: scenario === 'skip' && index === 0 ? 'skipped' : 'passed',
			titlePath: () => [tag],
		})) as unknown as TestCase[];
		if (scenario === 'missing') tests.shift();
		if (scenario === 'duplicate') tests.push(tests[0]);
		reporter.onBegin({} as FullConfig, { allTests: () => tests } as Suite);
		for (const [index, test] of tests.entries()) {
			if (scenario === 'not-run' && index === 0) continue;
			reporter.onTestEnd(test, {
				status: scenario === 'failure' && index === 0 ? 'failed' : 'passed',
			} as TestResult);
		}
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		try {
			await expect(reporter.onEnd({ status: 'passed', startTime: new Date(), duration: 0 })).resolves.toEqual({
				status: scenario === 'complete' ? 'passed' : 'failed',
			});
		} finally {
			error.mockRestore();
		}
	},
);
