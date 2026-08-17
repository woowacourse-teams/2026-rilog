import type { FullFeedPostResponse, PostItemResponse } from '@/api/feeds/types';
import type { ApiResponse } from '@/api/shared.types';

import type { PostFeedItem, PostFeedPage } from '@/domains/post/model/post-feed';

const mapPostItem = (post: PostItemResponse): PostFeedItem | null => {
	const { blog, postId, publishedAt, thumbnailUrl, title, user } = post;

	if (postId === undefined || title === undefined || publishedAt === undefined || user?.nickname === undefined) {
		return null;
	}

	const isTeamBlogPost =
		blog?.blogId !== undefined && user.userId !== undefined && blog.blogId !== user.userId && blog.name !== undefined;

	return {
		id: postId,
		title,
		thumbnailUrl: thumbnailUrl || null,
		publishedAt,
		author: {
			nickname: user.nickname,
			profileImageUrl: user.profileImageUrl || null,
		},
		colog: isTeamBlogPost
			? {
					name: blog.name,
					logoUrl: blog.profileUrl || null,
				}
			: null,
	};
};

export const mapFullFeedPostResponse = (
	response: ApiResponse<FullFeedPostResponse>,
	requestedPage: number,
): PostFeedPage => {
	const data = response.data;

	if (data === undefined) {
		throw new Error('피드 응답에 게시물 데이터가 없습니다.');
	}

	return {
		items: (data.posts ?? []).flatMap((post) => {
			const item = mapPostItem(post);

			return item === null ? [] : [item];
		}),
		page: data.page ?? requestedPage,
		hasNext: data.hasNext ?? false,
	};
};
