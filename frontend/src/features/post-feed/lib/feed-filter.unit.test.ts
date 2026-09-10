import { describe, expect, it } from 'vitest';

import type { FullFeedPostsFilters } from '@/shared/api/feeds/types';

import { buildFeedFilterHref, parseFeedFilters } from './feed-filter';

const CATEGORIES = [undefined, 'tech', 'daily', 'retrospect'] as const;
const BLOG_TYPES = [undefined, 'personal', 'colog'] as const;

describe('parseFeedFilters', () => {
	it.each(
		CATEGORIES.flatMap((category) =>
			BLOG_TYPES.map((blogType) => ({
				category,
				blogType,
			})),
		),
	)('category=$category, blogType=$blogType 조합을 파싱한다', ({ category, blogType }) => {
		const searchParams = new URLSearchParams();
		if (category !== undefined) searchParams.set('category', category);
		if (blogType !== undefined) searchParams.set('blogType', blogType);

		expect(parseFeedFilters(searchParams)).toEqual({
			category: category?.toUpperCase(),
			blogType: blogType === 'personal' ? 'RILOG' : blogType?.toUpperCase(),
		});
	});

	it.each(['RILOG', 'rilog'] as const)('기존 blogType=%s URL도 내부 enum으로 해석한다', (blogType) => {
		expect(parseFeedFilters(new URLSearchParams(`category=TECH&blogType=${blogType}`))).toEqual({
			category: 'TECH',
			blogType: 'RILOG',
		});
	});

	it.each([
		['허용되지 않은 값', new URLSearchParams('category=UNKNOWN&blogType=TEAM')],
		['중복된 값', new URLSearchParams('category=tech&category=daily&blogType=rilog&blogType=colog')],
	])('%s은 선택하지 않은 필터로 정규화한다', (_, searchParams) => {
		expect(parseFeedFilters(searchParams)).toEqual({ category: undefined, blogType: undefined });
	});
});

describe('buildFeedFilterHref', () => {
	it('카테고리만 바꿀 때 blogType과 notice를 유지한다', () => {
		expect(
			buildFeedFilterHref(new URLSearchParams('blogType=colog&category=tech&notice=auth-required'), {
				category: 'DAILY',
			}),
		).toBe('/feeds?notice=auth-required&blogType=colog&category=daily');
	});

	it('블로그 유형만 바꿀 때 category와 notice를 유지한다', () => {
		expect(
			buildFeedFilterHref(new URLSearchParams('blogType=personal&category=retrospect&notice=auth-required'), {
				blogType: 'COLOG',
			}),
		).toBe('/feeds?notice=auth-required&blogType=colog&category=retrospect');
	});

	it('잘못되거나 중복된 필터는 제거하고 다른 query parameter는 유지한다', () => {
		const searchParams: Record<string, string | readonly string[]> = {
			category: ['tech', 'daily'],
			blogType: 'UNKNOWN',
			notice: 'auth-required',
		};

		expect(buildFeedFilterHref(searchParams, { blogType: 'RILOG' })).toBe(
			'/feeds?notice=auth-required&blogType=personal',
		);
	});

	it('한 축의 전체 선택은 해당 축만 제거한다', () => {
		const filters: FullFeedPostsFilters = parseFeedFilters(new URLSearchParams('blogType=personal&category=tech'));

		expect(
			buildFeedFilterHref({ blogType: filters.blogType, category: filters.category }, { category: undefined }),
		).toBe('/feeds?blogType=personal');
	});
});
