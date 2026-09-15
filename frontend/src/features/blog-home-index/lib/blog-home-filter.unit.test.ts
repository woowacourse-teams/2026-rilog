import { describe, expect, it } from 'vitest';

import type { BlogHomeIndex } from '@/features/blog-home-index/model/blog-home-index';

import { buildBlogHomeFilterHref, isBlogHomeFilterAvailable, parseBlogHomeFilter } from './blog-home-filter';

const INDEX: BlogHomeIndex = {
	totalCount: 8,
	chapterIndexes: [{ id: 3, name: '회고', postCount: 5 }],
	cologIndexes: [{ id: 7, slug: 'rilog-team', name: '리로그 팀', profileImageUrl: null, postCount: 3 }],
};

describe('parseBlogHomeFilter', () => {
	it.each([
		[{ series: '3' }, 'RILOG', { type: 'chapterId', chapterId: 3 }],
		[{ chapter: '3' }, 'COLOG', { type: 'chapterId', chapterId: 3 }],
		[{ colog: 'rilog-team' }, 'RILOG', { type: 'targetCologSlug', targetCologSlug: 'rilog-team' }],
		[{}, 'RILOG', { type: 'all' }],
		[{ notice: 'keep' }, 'RILOG', { type: 'all' }],
	] as const)('%s query %o에서 상호배타 필터를 파싱한다', (searchParams, blogType, expected) => {
		expect(parseBlogHomeFilter(searchParams, blogType)).toEqual(expected);
	});

	it.each([
		[{ series: ['3', '4'] }, 'RILOG'],
		[{ colog: ['rilog-team', 'another-team'] }, 'RILOG'],
		[{ series: '3', colog: 'rilog-team' }, 'RILOG'],
		[{ series: '0' }, 'RILOG'],
		[{ chapter: '3.5' }, 'COLOG'],
		[{ colog: '잘못된 slug' }, 'RILOG'],
		[{ chapter: '3' }, 'RILOG'],
		[{ series: '3' }, 'COLOG'],
		[{ colog: 'rilog-team' }, 'COLOG'],
		[{ colog: '@rilog-team' }, 'RILOG'],
		[{ colog: 'RILOG-TEAM' }, 'RILOG'],
		[{ chapterId: '3' }, 'RILOG'],
		[{ targetCologSlug: 'rilog-team' }, 'RILOG'],
	] as const)('중복·동시·형식·profile type 오류 query %o를 invalid로 판단한다', (searchParams, blogType) => {
		expect(parseBlogHomeFilter(searchParams, blogType)).toBeNull();
	});
});

describe('buildBlogHomeFilterHref', () => {
	it('인덱스 필터만 제거하고 다른 query와 중복 값은 보존한다', () => {
		const searchParams = new URLSearchParams('series=3&chapter=3&colog=old-team&tab=recent&notice=one&notice=two');

		expect(
			buildBlogHomeFilterHref(
				'/@rilog',
				searchParams,
				{ type: 'targetCologSlug', targetCologSlug: 'rilog-team' },
				'RILOG',
			),
		).toBe('/@rilog?tab=recent&notice=one&notice=two&colog=rilog-team');
	});

	it('동일한 chapterId 필터를 profile type에 맞는 series 또는 chapter query로 만든다', () => {
		expect(buildBlogHomeFilterHref('/@rilog', '', { type: 'chapterId', chapterId: 3 }, 'RILOG')).toBe(
			'/@rilog?series=3',
		);
		expect(buildBlogHomeFilterHref('/@team', '', { type: 'chapterId', chapterId: 3 }, 'COLOG')).toBe(
			'/@team?chapter=3',
		);
	});
});

describe('isBlogHomeFilterAvailable', () => {
	it('profile type과 인덱스 소속을 함께 사용해 필터를 검증한다', () => {
		expect(isBlogHomeFilterAvailable({ type: 'chapterId', chapterId: 3 }, INDEX, 'COLOG')).toBe(true);
		expect(isBlogHomeFilterAvailable({ type: 'chapterId', chapterId: 99 }, INDEX, 'COLOG')).toBe(false);
		expect(isBlogHomeFilterAvailable({ type: 'targetCologSlug', targetCologSlug: 'rilog-team' }, INDEX, 'RILOG')).toBe(
			true,
		);
		expect(isBlogHomeFilterAvailable({ type: 'targetCologSlug', targetCologSlug: 'rilog-team' }, INDEX, 'COLOG')).toBe(
			false,
		);
	});
});
