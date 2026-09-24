import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

import { REQUIRED_E2E_FLOW_TAGS } from '@/test/e2e/required-flows';

const REQUIRED_TAG_PREFIX = '@required-e2e-';
const REQUIRED_E2E_FLOW_TAG_VALUES: string[] = Object.values(REQUIRED_E2E_FLOW_TAGS);
const REQUIRED_E2E_FLOW_TAG_SET = new Set(REQUIRED_E2E_FLOW_TAG_VALUES);

export default class RequiredE2eFlowReporter implements Reporter {
	private readonly diagnostics: string[] = [];
	private readonly results = new Map<string, TestResult['status']>();

	onBegin(_config: FullConfig, suite: Suite) {
		const testsByTag = new Map(REQUIRED_E2E_FLOW_TAG_VALUES.map((tag) => [tag, [] as TestCase[]]));

		for (const testCase of suite.allTests()) {
			const requiredTags = testCase.tags.filter((tag) => tag.startsWith(REQUIRED_TAG_PREFIX));
			if (requiredTags.length > 1) {
				this.diagnostics.push(`${testCase.titlePath().join(' › ')} 테스트에는 필수 E2E 태그를 하나만 지정해야 합니다.`);
			}

			for (const tag of requiredTags) {
				if (!REQUIRED_E2E_FLOW_TAG_SET.has(tag)) {
					this.diagnostics.push(`등록되지 않은 필수 E2E 태그입니다: ${tag}`);
					continue;
				}
				testsByTag.get(tag)?.push(testCase);
			}
		}

		for (const [tag, tests] of testsByTag) {
			if (tests.length !== 1) {
				this.diagnostics.push(`${tag} 테스트는 정확히 1개여야 하지만 ${tests.length}개가 수집됐습니다.`);
				continue;
			}
			if (tests[0]?.expectedStatus !== 'passed') {
				this.diagnostics.push(`${tag} 테스트에 skip, fixme 또는 예상 실패가 설정됐습니다.`);
			}
		}
	}

	onTestEnd(testCase: TestCase, result: TestResult) {
		for (const tag of testCase.tags) {
			if (REQUIRED_E2E_FLOW_TAG_SET.has(tag)) {
				this.results.set(tag, result.status);
			}
		}
	}

	onEnd(result: FullResult): Promise<{ status: FullResult['status'] }> {
		if (!process.argv.includes('--list')) {
			for (const tag of REQUIRED_E2E_FLOW_TAG_VALUES) {
				const status = this.results.get(tag);
				if (status !== 'passed') {
					this.diagnostics.push(`${tag} 실행 결과가 passed가 아닙니다: ${status ?? '실행되지 않음'}`);
				}
			}
		}

		if (this.diagnostics.length === 0) {
			return Promise.resolve({ status: result.status });
		}

		console.error(
			['필수 E2E 흐름 검증에 실패했습니다.', ...this.diagnostics.map((message) => `- ${message}`)].join('\n'),
		);
		return Promise.resolve({ status: 'failed' });
	}

	printsToStdio() {
		return false;
	}
}
