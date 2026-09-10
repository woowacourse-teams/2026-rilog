import type { BlogType } from '@/domains/blog/model/blog';
import { POST_CATEGORY_OPTIONS, type PostCategory } from '@/domains/post/model/post';
import type { FullFeedPostsFilters } from '@/shared/api/feeds/types';
import { APP_ROUTES } from '@/shared/routes/app-routes';

const BLOG_TYPE_PARAM = 'blogType';
const CATEGORY_PARAM = 'category';
const BLOG_TYPES = ['RILOG', 'COLOG'] as const satisfies readonly BlogType[];
const CATEGORIES = POST_CATEGORY_OPTIONS.map(({ value }) => value);

export type FeedSearchParams = Record<string, string | readonly string[] | undefined>;

interface SearchParamsReader {
	getAll: (name: string) => string[];
	toString: () => string;
}

type FeedFilterChange = { blogType: BlogType | undefined } | { category: PostCategory | undefined };

const isSearchParamsReader = (
	searchParams: FeedSearchParams | SearchParamsReader,
): searchParams is SearchParamsReader => typeof (searchParams as SearchParamsReader).getAll === 'function';

const readAllValues = (searchParams: FeedSearchParams | SearchParamsReader, name: string) => {
	if (isSearchParamsReader(searchParams)) {
		return searchParams.getAll(name);
	}

	const value = searchParams[name];
	if (value === undefined) {
		return [];
	}

	return typeof value === 'string' ? [value] : [...value];
};

const readFilterValue = <T extends string>(values: string[], allowedValues: readonly T[]): T | undefined =>
	values.length === 1 && allowedValues.some((allowedValue) => allowedValue === values[0])
		? (values[0] as T)
		: undefined;

export const parseFeedFilters = (searchParams: FeedSearchParams | SearchParamsReader): FullFeedPostsFilters => ({
	blogType: readFilterValue(readAllValues(searchParams, BLOG_TYPE_PARAM), BLOG_TYPES),
	category: readFilterValue(readAllValues(searchParams, CATEGORY_PARAM), CATEGORIES),
});

const createSearchParams = (searchParams: FeedSearchParams | SearchParamsReader) => {
	if (isSearchParamsReader(searchParams)) {
		return new URLSearchParams(searchParams.toString());
	}

	const result = new URLSearchParams();
	Object.entries(searchParams).forEach(([name, value]) => {
		if (typeof value === 'string') {
			result.append(name, value);
			return;
		}

		value?.forEach((entry) => result.append(name, entry));
	});

	return result;
};

export const buildFeedFilterHref = (searchParams: FeedSearchParams | SearchParamsReader, change: FeedFilterChange) => {
	const currentSearchParams = createSearchParams(searchParams);
	const filters = parseFeedFilters(currentSearchParams);
	const nextFilters: FullFeedPostsFilters = { ...filters, ...change };

	currentSearchParams.delete(BLOG_TYPE_PARAM);
	currentSearchParams.delete(CATEGORY_PARAM);

	if (nextFilters.blogType !== undefined) {
		currentSearchParams.set(BLOG_TYPE_PARAM, nextFilters.blogType);
	}
	if (nextFilters.category !== undefined) {
		currentSearchParams.set(CATEGORY_PARAM, nextFilters.category);
	}

	const query = currentSearchParams.toString();
	return query.length > 0 ? `${APP_ROUTES.feeds}?${query}` : APP_ROUTES.feeds;
};
