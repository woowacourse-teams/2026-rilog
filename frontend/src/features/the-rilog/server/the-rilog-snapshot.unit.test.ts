import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPostDetail } from '@/shared/api/posts/api';
import { readTheRilog } from '@/shared/api/the-rilog/api';
import {
	createTheRilogFixtureData,
	createTheRilogFixtureNewsContent,
	createTheRilogFixtureSnapshot,
} from '@/test/fixtures/the-rilog';

import { captureTheRilogSnapshot, createTheRilogSnapshot, parseTheRilogSnapshot } from './the-rilog-snapshot';

vi.mock('@/shared/api/the-rilog/api', () => ({ readTheRilog: vi.fn() }));
vi.mock('@/shared/api/posts/api', () => ({ readPostDetail: vi.fn() }));

afterEach(() => vi.resetAllMocks());

describe('the rilog snapshot', () => {
	it('실제 데이터와 본문을 저장한 뒤 다시 읽어 같은 checksum과 링크를 복원한다', () => {
		const snapshot = createTheRilogFixtureSnapshot();
		expect(parseTheRilogSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
	});

	it('JSON 키의 순서가 달라져도 같은 콘텐츠 checksum을 생성한다', () => {
		const data = createTheRilogFixtureData();
		const reordered = { spotlights: data.spotlights, news: data.news, date: data.date, blogSlug: data.blogSlug };
		expect(createTheRilogSnapshot(reordered, createTheRilogFixtureNewsContent(), 'api').checksum).toBe(
			createTheRilogFixtureSnapshot().checksum,
		);
	});

	it.each([
		{ schemaVersion: 2 },
		{ source: 'production' },
		{ checksum: 'changed' },
		{ capturedAt: 'unknown' },
		{ newsContent: [{ id: 'broken' }] },
		{ data: { ...createTheRilogFixtureData(), date: false } },
	])('입력이 손상되면 스냅샷을 승인하지 않는다', (patch) => {
		expect(() => parseTheRilogSnapshot({ ...createTheRilogFixtureSnapshot(), ...patch })).toThrow();
	});

	it('저장된 콘텐츠가 바뀌면 오래된 checksum으로 빌드하지 않는다', () => {
		const snapshot = createTheRilogFixtureSnapshot();
		expect(() => parseTheRilogSnapshot({ ...snapshot, data: { ...snapshot.data, date: '2026-10-14' } })).toThrow(
			'checksum',
		);
	});

	it('서로 다른 본문 제목을 승인하지 않는다', () => {
		const content = createTheRilogFixtureNewsContent();
		const data = createTheRilogFixtureData();
		if (data.news) data.news.headlines[0] = { title: '다른 제목' };
		expect(() => createTheRilogSnapshot(data, content, 'api')).toThrow('제목');
	});

	it('정상 빈 결과는 빈 스냅샷으로 보존한다', () => {
		const snapshot = createTheRilogSnapshot(
			createTheRilogFixtureData({ news: null, date: null, spotlights: [] }),
			null,
			'api',
		);
		expect(parseTheRilogSnapshot(snapshot).newsContent).toBeNull();
	});

	it('응답에 추가된 작성자·권한 정보는 빌드 입력에 보관하지 않는다', () => {
		const data = { ...createTheRilogFixtureData(), author: { name: '작성자' }, viewerPermissions: { canEdit: true } };
		const snapshot = createTheRilogSnapshot(data, createTheRilogFixtureNewsContent(), 'api');
		expect(snapshot.data).not.toHaveProperty('author');
		expect(snapshot.data).not.toHaveProperty('viewerPermissions');
	});
});

describe('captureTheRilogSnapshot', () => {
	it('뉴스가 없으면 상세 요청 없이 API 입력으로 표시한 스냅샷을 생성한다', async () => {
		vi.mocked(readTheRilog).mockResolvedValue({
			status: 200,
			message: 'OK',
			data: createTheRilogFixtureData({ news: null }),
		});
		const snapshot = await captureTheRilogSnapshot();
		expect(snapshot.source).toBe('api');
		expect(snapshot.newsContent).toBeNull();
		expect(readPostDetail).not.toHaveBeenCalled();
	});

	it('뉴스 상세가 실패하면 빈 본문으로 스냅샷을 생성하지 않는다', async () => {
		vi.mocked(readTheRilog).mockResolvedValue({ status: 200, message: 'OK', data: createTheRilogFixtureData() });
		vi.mocked(readPostDetail).mockRejectedValue(new Error('뉴스 상세 요청 실패'));
		await expect(captureTheRilogSnapshot()).rejects.toThrow('뉴스 상세 요청 실패');
		expect(readPostDetail).toHaveBeenCalledExactlyOnceWith({ slug: 'the_rilog', postId: 100 }, { cache: 'no-store' });
	});
});
