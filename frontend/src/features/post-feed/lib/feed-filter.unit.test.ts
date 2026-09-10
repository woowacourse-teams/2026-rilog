import { describe, expect, it } from 'vitest';

import type { PostCategory } from '@/domains/post/model/post';
import type { FullFeedPostsFilters } from '@/shared/api/feeds/types';

import { buildFeedFilterHref, parseFeedFilters } from './feed-filter';

const CATEGORIES = [undefined, 'TECH', 'DAILY', 'RETROSPECT'] as const satisfies readonly (PostCategory | undefined)[];
const BLOG_TYPES = [undefined, 'RILOG', 'COLOG'] as const;

describe('parseFeedFilters', () => {
	it.each(
		CATEGORIES.flatMap((category) =>
			BLOG_TYPES.map((blogType) => ({
				category,
				blogType,
			})),
		),
	)('category=$category, blogType=$blogType 조합을 파싱한다', (filters) => {
		const searchParams = new URLSearchParams();
		if (filters.category !== undefined) searchParams.set('category', filters.category);
		if (filters.blogType !== undefined) searchParams.set('blogType', filters.blogType);

		expect(parseFeedFilters(searchParams)).toEqual(filters);
	});

	it.each([
		['허용되지 않은 값', new URLSearchParams('category=UNKNOWN&blogType=TEAM')],
		['중복된 값', new URLSearchParams('category=TECH&category=DAILY&blogType=RILOG&blogType=COLOG')],
	])('%s은 선택하지 않은 필터로 정규화한다', (_, searchParams) => {
		expect(parseFeedFilters(searchParams)).toEqual({ category: undefined, blogType: undefined });
	});
});

describe('buildFeedFilterHref', () => {
	it('카테고리만 바꿀 때 blogType과 notice를 유지한다', () => {
		expect(
			buildFeedFilterHref(new URLSearchParams('blogType=COLOG&category=TECH&notice=auth-required'), {
				category: 'DAILY',
			}),
		).toBe('/feeds?notice=auth-required&blogType=COLOG&category=DAILY');
	});

	it('블로그 유형만 바꿀 때 category와 notice를 유지한다', () => {
		expect(
			buildFeedFilterHref(new URLSearchParams('blogType=RILOG&category=RETROSPECT&notice=auth-required'), {
				blogType: 'COLOG',
			}),
		).toBe('/feeds?notice=auth-required&blogType=COLOG&category=RETROSPECT');
	});

	it('잘못되거나 중복된 필터는 제거하고 다른 query parameter는 유지한다', () => {
		const searchParams: Record<string, string | readonly string[]> = {
			category: ['TECH', 'DAILY'],
			blogType: 'UNKNOWN',
			notice: 'auth-required',
		};

		expect(buildFeedFilterHref(searchParams, { blogType: 'RILOG' })).toBe('/feeds?notice=auth-required&blogType=RILOG');
	});

	it('한 축의 전체 선택은 해당 축만 제거한다', () => {
		const filters: FullFeedPostsFilters = parseFeedFilters(new URLSearchParams('blogType=RILOG&category=TECH'));

		expect(
			buildFeedFilterHref({ blogType: filters.blogType, category: filters.category }, { category: undefined }),
		).toBe('/feeds?blogType=RILOG');
	});
});
