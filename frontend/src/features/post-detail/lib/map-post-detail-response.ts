import type { Block } from '@blocknote/core';

import type { Blog } from '@/domains/blog/model/blog';
import type { PostCategory, PostDetail } from '@/domains/post/model/post';
import type { User } from '@/domains/user/model/user';
import type { PostDetailResponse } from '@/shared/api/posts/types';

export const mapPostDetailResponse = (response: PostDetailResponse, postId?: number): PostDetail => {
	const author: User = {
		id: response.author.userId,
		nickname: response.author.nickname || response.author.name || '알 수 없음',
		slug: response.author.slug,
		profileImageUrl: response.author.profileImageUrl ?? null,
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

	const category: PostCategory = response.category === 'DAILY' ? 'DAILY' : 'IT';

	return {
		id: postId ?? response.owner.blogId,
		title: response.title,
		content: (Array.isArray(response.content) ? response.content : []) as Block[],
		publishedAt: response.publishedAt,
		thumbnailUrl: response.thumbnailImageUrl ?? null,
		author,
		category,
		blog,
		viewerPermissions: response.viewerPermissions,
	};
};
