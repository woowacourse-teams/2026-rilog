import { readFile, rm, writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { APIResponse } from '@playwright/test';

import { isRecord } from '@/shared/api/response-validation';

import { refreshTheRilog } from '../../../scripts/refresh-the-rilog.mjs';

const statePath = '.the-rilog-build/server-fixture-state.json';
const requestLog = '.the-rilog-build/server-fixture-requests.log';
const authorization = 'Bearer playwright-local-refresh-secret';

async function readReceipt(response: APIResponse) {
	const value: unknown = await response.json();
	if (!isRecord(value) || typeof value.checksum !== 'string' || typeof value.capturedAt !== 'string') {
		throw new Error('Expected a validated refresh receipt.');
	}
	return { checksum: value.checksum, capturedAt: value.capturedAt };
}

test('예약 갱신은 전체 빌드 없이 정적 HTML을 교체하고 API 실패 시 이전 페이지를 유지한다', async ({
	request,
	baseURL,
}) => {
	test.setTimeout(120_000);
	await rm(requestLog, { force: true });
	await rm(statePath, { force: true });
	const refresh = () => request.post('/api/internal/the-rilog/revalidate', { headers: { authorization } });
	const html = async () => {
		const response = await request.get('/the-rilog');
		expect(response.ok()).toBe(true);
		return response.text();
	};
	const assertWarm = async (receipt: { checksum: string; capturedAt: string }) => {
		await expect
			.poll(async () => (await html()).includes(`data-the-rilog-captured-at="${receipt.capturedAt}"`))
			.toBe(true);
		expect(await html()).toContain(`data-the-rilog-input="${receipt.checksum}"`);
	};
	try {
		const unauthorized = await request.post('/api/internal/the-rilog/revalidate');
		expect(unauthorized.status()).toBe(401);
		await expect(readFile(requestLog, 'utf8')).rejects.toThrow();

		await writeFile(statePath, JSON.stringify({ mode: 'updated' }));
		const response = await refresh();
		expect(response.status()).toBe(202);
		const receipt = await readReceipt(response);
		await assertWarm(receipt);
		expect(await html()).toContain('갱신된 기업 기사');
		const requestsAfterRefresh = await readFile(requestLog, 'utf8');
		await html();
		await html();
		expect(await readFile(requestLog, 'utf8')).toBe(requestsAfterRefresh);

		// Exercise the actual daily runner and prove unchanged data still regenerates.
		if (!baseURL) throw new Error('Production server URL is required.');
		const runnerReceipt = await refreshTheRilog({
			env: {
				THE_RILOG_REVALIDATION_SECRET: 'playwright-local-refresh-secret',
				THE_RILOG_REFRESH_BASE_URL: baseURL.replace('localhost', '127.0.0.1'),
			},
		});
		expect(runnerReceipt.checksum).toBe(receipt.checksum);
		expect(runnerReceipt.capturedAt).not.toBe(receipt.capturedAt);

		for (const mode of ['unavailable', 'invalid']) {
			await writeFile(statePath, JSON.stringify({ mode }));
			expect((await refresh()).status()).toBe(503);
			expect(await html()).toContain('갱신된 기업 기사');
			expect(await html()).toContain(`data-the-rilog-captured-at="${runnerReceipt.capturedAt}"`);
		}
		await writeFile(statePath, JSON.stringify({ mode: 'empty' }));
		const emptyResponse = await refresh();
		expect(emptyResponse.status()).toBe(202);
		await assertWarm(await readReceipt(emptyResponse));
		expect(await html()).toContain('아직 등록된 아티클이 없습니다.');
	} finally {
		await rm(statePath, { force: true });
		const restore = await refresh();
		if (restore.status() === 202) await assertWarm(await readReceipt(restore));
	}
});
