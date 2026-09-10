import type { Block } from '@blocknote/core';

import type { Blog } from '@/domains/blog/model/blog';
import type { PostDetail, PostDetailAuthor } from '@/domains/post/model/post';
import type { PostDetailResponse } from '@/shared/api/posts/types';

import { mapPostCategoryResponse } from './map-post-category-response';

export const mapPostDetailResponse = (response: PostDetailResponse, postId?: number): PostDetail => {
	const author: PostDetailAuthor = {
		id: response.author.userId,
		nickname: response.author.nickname || response.author.name || '알 수 없음',
		slug: response.author.slug,
		profileImageUrl: response.author.profileImageUrl ?? null,
		// 저자 소개는 게시글 상세 API 계약에 추가된 뒤 연결한다.
		description: null,
	};

	const blog: Blog =
		response.owner.type === 'COLOG'
			? {
					id: response.owner.blogId,
					name: response.owner.name,
					slug: response.owner.slug,
					type: 'COLOG',
					profileImageUrl: response.owner.profileImageUrl ?? null,
					coverImageUrl: response.owner.coverImageUrl ?? null,
					memberCount: response.owner.memberCount ?? 0,
					postCount: response.owner.postCount ?? 0,
					description: '',
				}
			: {
					id: response.owner.blogId,
					name: response.owner.name,
					slug: response.owner.slug,
					type: 'RILOG',
					profileImageUrl: response.owner.profileImageUrl ?? null,
					owner: author,
				};

	return {
		id: postId ?? response.owner.blogId,
		title: response.title,
		content: (Array.isArray(response.content) ? response.content : []) as Block[],
		publishedAt: response.publishedAt,
		thumbnailUrl: response.thumbnailImageUrl ?? null,
		author,
		category: mapPostCategoryResponse(response.category),
		chapter:
			response.chapter === null
				? null
				: {
						id: response.chapter.chapterId,
						name: response.chapter.name,
						order: response.chapter.order,
					},
		blog,
		viewerPermissions: response.viewerPermissions,
	};
};
