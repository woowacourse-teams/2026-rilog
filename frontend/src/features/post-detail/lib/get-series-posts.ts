import type { PostDetailChapter } from '@/domains/post/model/post';
import type { SeriesChapter } from '@/features/post-detail/model/series';
import { readPublicBlogPosts } from '@/shared/api/blogs/api';

import { mapSeriesPostsResponse } from './map-series-posts-response';

const SERIES_POSTS_PAGE = 0;
const SERIES_POSTS_PAGE_SIZE = 30;

interface GetSeriesPostsOptions {
	slug: string;
	chapter: PostDetailChapter;
}

export const getSeriesPosts = async ({ slug, chapter }: GetSeriesPostsOptions): Promise<SeriesChapter | null> => {
	try {
		const response = await readPublicBlogPosts({
			slug,
			page: SERIES_POSTS_PAGE,
			size: SERIES_POSTS_PAGE_SIZE,
			filter: { type: 'chapterId', chapterId: chapter.id },
		});

		return mapSeriesPostsResponse(response, chapter);
	} catch {
		return null;
	}
};
