import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { extractPostHeadingAnchors } from '@/features/post-detail/lib/extract-post-table-of-contents';
import { createTheRilogFixtureData, createTheRilogFixtureNewsContent } from '@/test/fixtures/the-rilog';

import { mapTheRilogContent } from './map-the-rilog-content';

const heading = (id: string, title: string, level: 1 | 2 | 3 = 2, children: Block[] = []): Block => ({
	id,
	type: 'heading',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left', level, isToggleable: false },
	content: [{ type: 'text', text: title, styles: {} }],
	children,
});

describe('mapTheRilogContent', () => {
	it('응답 순서와 썸네일을 유지하고 기존 게시글 경로와 상세 앵커로 연결한다', () => {
		const data = createTheRilogFixtureData();
		data.spotlights[0].thumbnailImageUrl = 'https://images.rilog.test/article.jpg';
		const content = mapTheRilogContent(data, createTheRilogFixtureNewsContent());
		expect(content.dailyHeadlines[0]).toEqual({
			id: '100:headline-1',
			title: '새 모델 공개',
			href: `/@the_rilog/posts/100#${encodeURIComponent('새-모델-공개')}`,
		});
		expect(content.articles.map((article) => article.href)).toEqual(['/@the_rilog/posts/101', '/@the_rilog/posts/102']);
		expect(content.articles[0]?.thumbnailImageUrl).toBe('https://images.rilog.test/article.jpg');
		expect(content.articles[0]?.profile).toEqual({
			type: 'enterprise',
			name: '테스트 기업',
			profileImageUrl: null,
		});
		expect(content.articles[1]?.profile).toEqual({ type: 'bloger', name: '출처 정보 없음', profileImageUrl: null });
	});

	it('같은 제목이 반복되면 상세에서 사용하는 서로 다른 앵커로 이동한다', () => {
		const data = createTheRilogFixtureData({
			news: {
				postId: 100,
				slug: 'the_rilog',
				title: '뉴스',
				publishedAt: '2026-10-13T05:00:00',
				headlines: [{ title: '같은 제목' }, { title: '같은 제목' }],
			},
		});
		const blocks = [heading('one', '같은 제목'), heading('two', '같은 제목')];
		const { dailyHeadlines } = mapTheRilogContent(data, blocks);
		expect(dailyHeadlines[1]?.href).not.toBe(dailyHeadlines[0]?.href);
		expect(dailyHeadlines.map(({ href }) => href)).toEqual(
			extractPostHeadingAnchors(blocks).map(({ id }) => `/@the_rilog/posts/100#${encodeURIComponent(id)}`),
		);
	});

	it('공백과 유니코드 표현이 다르면 정규화해 대응하고 상세의 실제 ID를 사용한다', () => {
		const data = createTheRilogFixtureData({
			news: {
				postId: 100,
				slug: 'the_rilog',
				title: '뉴스',
				publishedAt: '2026-10-13T05:00:00',
				headlines: [{ title: '가 나' }],
			},
		});
		const result = mapTheRilogContent(data, [heading('one', '가  나')]);
		expect(result.dailyHeadlines[0]?.href).toBe(`/@the_rilog/posts/100#${encodeURIComponent('가-나')}`);
	});

	it('h1·h2·h3와 중첩 제목을 API 순서대로 상세 앵커에 연결한다', () => {
		const blocks = [
			heading('root', '서문', 1, [heading('headline-1', '새 모델 공개')]),
			heading('extra', '설명', 3),
			heading('headline-2', '웹 플랫폼 업데이트'),
		];
		const data = createTheRilogFixtureData();
		data.news!.headlines = ['서문', '새 모델 공개', '설명', '웹 플랫폼 업데이트'].map((title) => ({ title }));

		const { dailyHeadlines } = mapTheRilogContent(data, blocks);
		expect(dailyHeadlines.map(({ title }) => title)).toEqual(data.news!.headlines.map(({ title }) => title));
		expect(dailyHeadlines.map(({ href }) => href)).toEqual(
			extractPostHeadingAnchors(blocks).map(({ id }) => `/@the_rilog/posts/100#${encodeURIComponent(id)}`),
		);
	});

	it.each([
		null,
		[],
		[heading('one', '다른 제목'), heading('two', '웹 플랫폼 업데이트')],
		[heading('one', '새 모델 공개'), heading('two', '웹 플랫폼 업데이트'), heading('three', '추가 제목')],
	])('본문과 헤드라인이 일치하지 않으면 임의 위치 링크를 생성하지 않는다', (blocks) => {
		expect(() => mapTheRilogContent(createTheRilogFixtureData(), blocks)).toThrow();
	});

	it('뉴스가 없으면 헤드라인을 채우지 않고 빈 배열을 반환한다', () => {
		expect(mapTheRilogContent(createTheRilogFixtureData({ news: null }), null).dailyHeadlines).toEqual([]);
	});
});
