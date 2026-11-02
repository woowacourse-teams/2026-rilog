import type { OrderedChapter } from '@/domains/chapter/model/chapter';
import type { SeriesChapter } from '@/features/post-detail/model/series';
import { readPublicBlogChapterPosts } from '@/shared/api/blogs/api';

import { mapSeriesPostsResponse } from './map-series-posts-response';

const SERIES_POSTS_PAGE = 0;
const SERIES_POSTS_PAGE_SIZE = 30;

interface GetSeriesPostsOptions {
	slug: string;
	chapter: OrderedChapter;
}

export const getSeriesPosts = async ({ slug, chapter }: GetSeriesPostsOptions): Promise<SeriesChapter | null> => {
	try {
		const response = await readPublicBlogChapterPosts({
			slug,
			page: SERIES_POSTS_PAGE,
			size: SERIES_POSTS_PAGE_SIZE,
			chapterId: chapter.id,
		});

		return mapSeriesPostsResponse(response, chapter);
	} catch {
		return null;
	}
};
