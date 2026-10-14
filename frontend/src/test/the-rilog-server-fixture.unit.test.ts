import { spawnSync } from 'node:child_process';

import { expect, it } from 'vitest';

it('서버 fixture는 지정한 매거진 API만 제공하고 미등록 외부 요청은 실패시킨다', () => {
	const result = spawnSync(
		process.execPath,
		[
			'--import=./test-harness/the-rilog-server-fixture.mjs',
			'--input-type=module',
			'-e',
			`
				import assert from 'node:assert/strict';
				const detail = await fetch('https://api.rilog.test/v1/blogs/the_rilog/posts/100');
				assert.equal(detail.status, 200);
				assert.equal((await detail.json()).data.title, 'Daily Headlines');
				await assert.rejects(
					fetch('https://unexpected.invalid/unconfigured-service', { method: 'POST' }),
					/Unexpected external HTTP request/,
				);
			`,
		],
		{ cwd: process.cwd(), encoding: 'utf8' },
	);
	expect(result.status, result.stderr).toBe(0);
});
