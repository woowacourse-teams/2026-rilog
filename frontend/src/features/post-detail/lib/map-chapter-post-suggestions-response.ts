import type { OrderedChapter } from '@/domains/chapter/model/chapter';
import type { CologChapterPostSuggestions } from '@/features/post-detail/model/chapter';
import type { PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const mapChapterPostSuggestionsResponse = (
	response: ApiResponse<PublicBlogFeedPostResponse>,
	chapter: OrderedChapter,
): CologChapterPostSuggestions => {
	if (response.data === undefined) {
		throw new Error('챕터 추천 게시글 응답에 데이터가 없습니다.');
	}

	return {
		id: chapter.id,
		name: chapter.name,
		posts: response.data.posts.map((post) => ({
			id: post.postId,
			title: post.title,
			thumbnailUrl: post.thumbnailImageUrl,
			author: {
				slug: post.author.slug,
				nickname: post.author.nickname || post.author.name || '알 수 없음',
			},
		})),
	};
};
