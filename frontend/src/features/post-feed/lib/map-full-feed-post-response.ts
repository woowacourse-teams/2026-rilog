import type { BaseBlog } from '@/domains/blog/model/blog';
import type { PostFeedItem, PostFeedPage } from '@/domains/post/model/post';
import type { FullFeedPostResponse, PostItemResponse } from '@/shared/api/feeds/types';
import type { ApiResponse } from '@/shared/api/shared.types';

const mapPostItem = (post: PostItemResponse): PostFeedItem | null => {
	const { author, owner, postId, publishedAt, thumbnailImageUrl, title } = post;
	const authorName = author?.nickname || null;

	if (
		postId === undefined ||
		title === undefined ||
		publishedAt === undefined ||
		authorName === null ||
		author?.userId === undefined ||
		author?.slug === undefined ||
		owner?.blogId === undefined ||
		owner?.slug === undefined ||
		owner?.name === undefined ||
		(owner?.type !== 'RILOG' && owner?.type !== 'COLOG')
	) {
		return null;
	}

	const blog: BaseBlog = {
		id: owner.blogId,
		name: owner.name,
		slug: owner.slug,
		type: owner.type,
		profileImageUrl: owner.profileImageUrl ?? null,
	};

	return {
		id: postId,
		chapterName: post.chapter?.name ?? null,
		title,
		thumbnailUrl: thumbnailImageUrl ?? null,
		publishedAt,
		author: {
			id: author.userId,
			nickname: authorName,
			slug: author.slug,
			profileImageUrl: author.profileImageUrl ?? null,
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
