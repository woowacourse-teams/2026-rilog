import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { expect, it } from 'vitest';

import { REQUIRED_E2E_FLOW_TAGS } from '@/test/e2e/required-flows';

const require = createRequire(import.meta.url);
const cli = resolve(dirname(require.resolve('playwright/package.json')), 'cli.js');
const testModule = '@playwright/test';

it.each(['complete', 'missing-project', 'missing-flow', 'duplicate-flow', 'skipped-flow', 'failed-flow'])(
	'실제 blob 병합에서 전체 검증 계약을 적용한다: %s',
	(scenario) => {
		mkdirSync(resolve('test-results'), { recursive: true });
		const directory = mkdtempSync(resolve('test-results/merge-contract-'));
		const tags = Object.values(REQUIRED_E2E_FLOW_TAGS);
		const selected = scenario === 'missing-flow' ? tags.slice(1) : tags;
		const tests = selected.map((tag, index) => {
			const method = scenario === 'skipped-flow' && index === 0 ? 'test.skip' : 'test';
			const body = scenario === 'failed-flow' && index === 0 ? 'throw new Error("fixture failure");' : '';
			return `${method}('flow ${index}', { tag: '${tag}' }, () => { ${body} });`;
		});
		if (scenario === 'duplicate-flow') tests.push(`test('duplicate', { tag: '${tags[0]}' }, () => {});`);
		const projects = [
			{ name: 'chromium', testMatch: 'required.spec.ts' },
			{ name: 'webkit-comments', testMatch: 'browser.spec.ts' },
			...(scenario === 'missing-project' ? [] : [{ name: 'firefox-comments', testMatch: 'browser.spec.ts' }]),
		];
		writeFileSync(
			resolve(directory, 'required.spec.ts'),
			`import { test } from ${JSON.stringify(testModule)};\n${tests.join('\n')}`,
		);
		writeFileSync(
			resolve(directory, 'browser.spec.ts'),
			`import { test } from ${JSON.stringify(testModule)};\ntest('browser coverage', () => {});`,
		);
		writeFileSync(
			resolve(directory, 'config.ts'),
			`export default ${JSON.stringify({ testDir: directory, projects, workers: 1, retries: 0, outputDir: resolve(directory, 'output') })};`,
		);
		const run = (args: string[], project = 'merge') =>
			spawnSync(process.execPath, [cli, ...args], {
				encoding: 'utf8',
				timeout: 30_000,
				env: {
					...process.env,
					PLAYWRIGHT_BLOB_OUTPUT_FILE: resolve(directory, `blobs/${project}.zip`),
					PLAYWRIGHT_HTML_OUTPUT_DIR: resolve(directory, 'html'),
					PLAYWRIGHT_JSON_OUTPUT_FILE: resolve(directory, 'merged.json'),
				},
			});
		try {
			for (const project of projects) {
				const result = run(
					['test', '--config', resolve(directory, 'config.ts'), `--project=${project.name}`, '--reporter=blob'],
					project.name,
				);
				expect(result.status, result.stdout + result.stderr).toBe(
					scenario === 'failed-flow' && project.name === 'chromium' ? 1 : 0,
				);
			}
			const merged = run(['merge-reports', '--config', 'playwright.merge.config.ts', resolve(directory, 'blobs')]);
			expect(merged.status, merged.stdout + merged.stderr).toBe(0);
			const validation: unknown = JSON.parse(readFileSync('test-results/e2e-validation.json', 'utf8'));
			expect(validation).toMatchObject({ status: scenario === 'complete' ? 'passed' : 'failed' });
			if (scenario !== 'complete')
				expect(merged.stderr + merged.stdout).toContain('필수 E2E 흐름 검증에 실패했습니다.');
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	},
	60_000,
);
