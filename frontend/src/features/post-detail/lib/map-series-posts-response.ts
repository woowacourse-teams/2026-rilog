import type { OrderedChapter } from '@/domains/chapter/model/chapter';
import type { SeriesChapter } from '@/features/post-detail/model/series';
import type { PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const mapSeriesPostsResponse = (
	response: ApiResponse<PublicBlogFeedPostResponse>,
	chapter: OrderedChapter,
): SeriesChapter => {
	if (response.data === undefined) {
		throw new Error('시리즈 게시글 응답에 데이터가 없습니다.');
	}

	const posts = response.data.posts.map((post) => ({ id: post.postId, title: post.title }));

	return {
		id: chapter.id,
		name: chapter.name,
		postCount: response.data.numberOfElements,
		posts,
	};
};
