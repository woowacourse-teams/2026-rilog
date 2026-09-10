import type { BaseBlog } from '@/domains/blog/model/blog';
import type { PostFeedItem, PostFeedPage } from '@/domains/post/model/post';
import type { PublicBlogFeedPostResponse, PostItemResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

const mapPostItem = (post: PostItemResponse): PostFeedItem | null => {
	const { author, owner, postId, publishedAt, thumbnailImageUrl, title, chapter, category } = post;
	const authorName = author?.nickname?.trim() || null;

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

	const blog: BaseBlog = {
		id: owner.blogId ?? 0,
		name: owner.name,
		slug: owner.slug,
		type: owner.type,
		profileImageUrl: owner.profileImageUrl || null,
	};

	return {
		id: postId,
		chapterName: chapter?.name ?? null,
		title,
		thumbnailUrl: thumbnailImageUrl || null,
		publishedAt,
		categoryLabel: category ?? null,
		author: {
			id: author.userId ?? 0,
			nickname: authorName,
			slug: author.slug,
			profileImageUrl: author.profileImageUrl || null,
		},
		blog,
	};
};

export const mapPublicBlogPosts = (
	response: ApiResponse<PublicBlogFeedPostResponse>,
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
