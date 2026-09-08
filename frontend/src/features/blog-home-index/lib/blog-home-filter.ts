import type { BlogType } from '@/domains/blog/model/blog';
import { COLOG_SLUG_MAX_LENGTH, COLOG_SLUG_MIN_LENGTH, COLOG_SLUG_PATTERN } from '@/domains/blog/model/colog';
import type { BlogHomeIndex } from '@/features/blog-home-index/model/blog-home-index';
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';

const SERIES_PARAM = 'series';
const CHAPTER_PARAM = 'chapter';
const COLOG_PARAM = 'colog';
const LEGACY_CHAPTER_ID_PARAM = 'chapterId';
const LEGACY_TARGET_COLOG_SLUG_PARAM = 'targetCologSlug';
const FILTER_PARAMS = [SERIES_PARAM, CHAPTER_PARAM, COLOG_PARAM] as const;
const UNSUPPORTED_FILTER_PARAMS = [LEGACY_CHAPTER_ID_PARAM, LEGACY_TARGET_COLOG_SLUG_PARAM] as const;

export const ALL_BLOG_POSTS_FILTER: PublicBlogPostsFilter = { type: 'all' };

export type BlogHomeSearchParams = Record<string, string | readonly string[] | undefined>;

interface SearchParamsReader {
	getAll: (name: string) => string[];
}

export type ParsedBlogHomeFilter = PublicBlogPostsFilter | null;

const readAllValues = (searchParams: BlogHomeSearchParams | SearchParamsReader, name: string) => {
	const getAll = (searchParams as SearchParamsReader).getAll;
	if (typeof getAll === 'function') {
		return getAll.call(searchParams, name);
	}

	const value = (searchParams as BlogHomeSearchParams)[name];
	if (value === undefined) {
		return [];
	}

	return typeof value === 'string' ? [value] : [...value];
};

export const parseBlogHomeFilter = (
	searchParams: BlogHomeSearchParams | SearchParamsReader,
	blogType: BlogType,
): ParsedBlogHomeFilter => {
	if (UNSUPPORTED_FILTER_PARAMS.some((param) => readAllValues(searchParams, param).length > 0)) {
		return null;
	}

	const filterEntries = FILTER_PARAMS.map((name) => ({ name, values: readAllValues(searchParams, name) }));
	const selectedEntries = filterEntries.filter(({ values }) => values.length > 0);

	if (selectedEntries.length > 1 || selectedEntries.some(({ values }) => values.length > 1)) {
		return null;
	}

	const selectedEntry = selectedEntries[0];
	if (selectedEntry === undefined) {
		return ALL_BLOG_POSTS_FILTER;
	}

	const value = selectedEntry.values[0];
	if (value === undefined) {
		return null;
	}

	const expectedChapterParam = blogType === 'RILOG' ? SERIES_PARAM : CHAPTER_PARAM;
	if (selectedEntry.name === SERIES_PARAM || selectedEntry.name === CHAPTER_PARAM) {
		if (selectedEntry.name !== expectedChapterParam) {
			return null;
		}

		if (!/^[1-9]\d*$/.test(value)) {
			return null;
		}

		const chapterId = Number(value);
		return Number.isSafeInteger(chapterId) ? { type: 'chapterId', chapterId } : null;
	}

	if (blogType === 'RILOG') {
		if (
			value.length < COLOG_SLUG_MIN_LENGTH ||
			value.length > COLOG_SLUG_MAX_LENGTH ||
			!COLOG_SLUG_PATTERN.test(value)
		) {
			return null;
		}

		return { type: 'targetCologSlug', targetCologSlug: value };
	}

	return null;
};

export const buildBlogHomeFilterHref = (
	pathname: string,
	searchParams: string | { toString: () => string },
	filter: PublicBlogPostsFilter,
	blogType: BlogType,
) => {
	const nextSearchParams = new URLSearchParams(
		typeof searchParams === 'string' ? searchParams : searchParams.toString(),
	);
	FILTER_PARAMS.forEach((param) => nextSearchParams.delete(param));

	if (filter.type === 'chapterId') {
		nextSearchParams.set(blogType === 'RILOG' ? SERIES_PARAM : CHAPTER_PARAM, String(filter.chapterId));
	}

	if (filter.type === 'targetCologSlug') {
		nextSearchParams.set(COLOG_PARAM, filter.targetCologSlug);
	}

	const query = nextSearchParams.toString();
	return query.length > 0 ? `${pathname}?${query}` : pathname;
};

export const isBlogHomeFilterAvailable = (filter: PublicBlogPostsFilter, index: BlogHomeIndex, blogType: BlogType) => {
	if (filter.type === 'all') {
		return true;
	}

	if (filter.type === 'chapterId') {
		return index.chapterIndexes.some((chapter) => chapter.id === filter.chapterId);
	}

	return blogType === 'RILOG' && index.cologIndexes.some((colog) => colog.slug === filter.targetCologSlug);
};
