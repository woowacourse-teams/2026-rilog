import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { revalidatePath } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readTheRilog } from '@/shared/api/the-rilog/api';
import { createTheRilogFixtureData, createTheRilogFixtureSnapshot } from '@/test/fixtures/the-rilog';

import { refreshTheRilog } from './refresh-the-rilog';
import { readTheRilogSnapshot, writeTheRilogSnapshot } from './the-rilog-snapshot-store';

const { report } = vi.hoisted(() => ({ report: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/shared/api/the-rilog/api', () => ({ readTheRilog: vi.fn() }));
vi.mock('@/shared/api/posts/api', () => ({ readPostDetail: vi.fn() }));
vi.mock('@/shared/error-tracking/api-error-reporter-instance', () => ({ apiErrorReporter: { report } }));

let directory: string;
let previousInput: string;
const request = (authorization = 'Bearer refresh-test-secret') =>
	new Request('http://localhost/api/internal/the-rilog/revalidate', { method: 'POST', headers: { authorization } });

beforeEach(async () => {
	vi.clearAllMocks();
	directory = await mkdtemp(join(tmpdir(), 'the-rilog-refresh-'));
	vi.spyOn(process, 'cwd').mockReturnValue(directory);
	vi.stubEnv('THE_RILOG_REVALIDATION_SECRET', 'refresh-test-secret');
	await writeTheRilogSnapshot(createTheRilogFixtureSnapshot());
	previousInput = await readFile(join(directory, '.the-rilog-build/snapshot.json'), 'utf8');
	vi.mocked(readTheRilog).mockResolvedValue({
		status: 200,
		message: 'OK',
		data: createTheRilogFixtureData({ news: null, date: null, spotlights: [] }),
	});
});

afterEach(async () => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	await rm(directory, { recursive: true, force: true });
});

describe('더 리로그 갱신 경계', () => {
	it.each(['', 'Bearer wrong', 'refresh-test-secret'])(
		'인증되지 않은 요청은 저장 입력과 페이지 캐시를 유지한다',
		async (authorization) => {
			expect((await refreshTheRilog(request(authorization))).status).toBe(401);
			expect(readTheRilog).not.toHaveBeenCalled();
			expect(revalidatePath).not.toHaveBeenCalled();
			expect(await readFile(join(directory, '.the-rilog-build/snapshot.json'), 'utf8')).toBe(previousInput);
		},
	);

	it('secret 설정이 없으면 외부 입력을 수집하지 않고 실패한다', async () => {
		vi.stubEnv('THE_RILOG_REVALIDATION_SECRET', '');
		expect((await refreshTheRilog(request())).status).toBe(503);
		expect(readTheRilog).not.toHaveBeenCalled();
	});

	it('정상 빈 응답도 API 스냅샷으로 교체하고 해당 페이지만 갱신 대상으로 표시한다', async () => {
		const response = await refreshTheRilog(request());
		expect(response.status).toBe(202);
		expect(response.headers.get('cache-control')).toBe('no-store');
		const saved = await readTheRilogSnapshot();
		expect(saved.source).toBe('api');
		expect(saved.data.spotlights).toEqual([]);
		expect(await response.json()).toEqual({ checksum: saved.checksum, capturedAt: saved.capturedAt });
		expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/the-rilog');
		expect(report).not.toHaveBeenCalled();
	});

	it('갱신 중인 요청이 있으면 추가 수집을 거부하고 완료 후 다음 갱신을 허용한다', async () => {
		const capture = Promise.withResolvers<Awaited<ReturnType<typeof readTheRilog>>>();
		vi.mocked(readTheRilog).mockReturnValueOnce(capture.promise);
		const first = refreshTheRilog(request());
		try {
			await vi.waitFor(() => expect(readTheRilog).toHaveBeenCalledTimes(1));
			const duplicate = await refreshTheRilog(request());
			expect(duplicate.status).toBe(409);
			expect(readTheRilog).toHaveBeenCalledTimes(1);
			expect(revalidatePath).not.toHaveBeenCalled();
			expect(await readFile(join(directory, '.the-rilog-build/snapshot.json'), 'utf8')).toBe(previousInput);
		} finally {
			capture.resolve({
				status: 200,
				message: 'OK',
				data: createTheRilogFixtureData({ news: null, date: null, spotlights: [] }),
			});
			await first;
		}
		expect((await first).status).toBe(202);
		expect((await refreshTheRilog(request())).status).toBe(202);
	});

	it('API 수집 실패는 이전 입력과 캐시를 유지하고 다음 갱신을 허용한다', async () => {
		const error = new Error('Upstream unavailable');
		vi.mocked(readTheRilog).mockRejectedValueOnce(error);
		const response = await refreshTheRilog(request());
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain(error.message);
		expect(revalidatePath).not.toHaveBeenCalled();
		expect(await readFile(join(directory, '.the-rilog-build/snapshot.json'), 'utf8')).toBe(previousInput);
		expect(report).toHaveBeenCalledExactlyOnceWith(error, { operation: 'refresh the rilog snapshot' });
		expect((await refreshTheRilog(request())).status).toBe(202);
	});

	it('손상된 입력은 이전 파일을 덮어쓰지 않는다', async () => {
		await expect(writeTheRilogSnapshot({ ...createTheRilogFixtureSnapshot(), checksum: 'broken' })).rejects.toThrow(
			'checksum',
		);
		expect(await readFile(join(directory, '.the-rilog-build/snapshot.json'), 'utf8')).toBe(previousInput);
	});
});
