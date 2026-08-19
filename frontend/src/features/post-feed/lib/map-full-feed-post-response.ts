import type { BaseBlog } from '@/domains/blog/model/blog';
import type { PostFeedItem, PostFeedPage } from '@/domains/post/model/post';
import type { FullFeedPostResponse, PostItemResponse } from '@/shared/api/feeds/types';
import type { ApiResponse } from '@/shared/api/shared.types';

const mapPostItem = (post: PostItemResponse): PostFeedItem | null => {
	const { author, owner, postId, publishedAt, thumbnailImageUrl, title } = post;
	const authorName = author?.nickname || author?.name || null;

	if (
		postId === undefined ||
		title === undefined ||
		publishedAt === undefined ||
		authorName === null ||
		author?.slug === undefined ||
		owner?.slug === undefined ||
		owner?.name === undefined
	) {
		return null;
	}

	const blog: BaseBlog =
		owner.type === 'COLOG'
			? {
					id: owner.blogId ?? 0,
					name: owner.name,
					slug: owner.slug,
					type: 'COLOG',
					profileImageUrl: owner.logoImageUrl || null,
				}
			: {
					id: owner.blogId ?? 0,
					name: owner.name,
					slug: owner.slug,
					type: 'RILOG',
					profileImageUrl: owner.profileImageUrl || null,
				};

	return {
		id: postId,
		title,
		thumbnailUrl: thumbnailImageUrl || null,
		publishedAt,
		author: {
			id: author.userId ?? 0,
			nickname: authorName,
			slug: author.slug,
			profileImageUrl: author.profileImageUrl || null,
		},
		blog,
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
