import type { PostFeedItem, PostFeedPage } from '@/domains/post/model/post-feed';
import type { FullFeedPostResponse, PostItemResponse } from '@/shared/api/feeds/types';
import type { ApiResponse } from '@/shared/api/shared.types';

const mapPostItem = (post: PostItemResponse): PostFeedItem | null => {
	const { author, owner, postId, publishedAt, thumbnailImageUrl, title } = post;
	const authorName = author?.name ?? author?.nickname ?? null;

	if (
		postId === undefined ||
		title === undefined ||
		publishedAt === undefined ||
		authorName === null ||
		author?.slug === undefined
	) {
		return null;
	}

	const isTeamBlogPost = owner?.type === 'COLOG';

	if (isTeamBlogPost && (owner?.slug === undefined || owner?.name === undefined)) {
		return null;
	}

	return {
		id: postId,
		title,
		thumbnailUrl: thumbnailImageUrl || null,
		publishedAt,
		author: {
			nickname: authorName,
			slug: author.slug,
			profileImageUrl: author.profileImageUrl || null,
		},
		colog: isTeamBlogPost
			? {
					name: owner.name,
					slug: owner.slug,
					logoUrl: owner.logoImageUrl || null,
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
