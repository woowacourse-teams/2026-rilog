import type { Block } from '@blocknote/core';

import type { PostCategory } from '@/domains/post/model/post';
import type { PostWriteInitialData } from '@/features/post-write/model/post-publication';
import type { PostDetailResponse } from '@/shared/api/posts/types';

const mapPostCategory = (category: string): PostCategory =>
	category === 'DAILY' || category === '일상' ? 'DAILY' : 'IT';

export const mapPostDetailToPostWriteInitialData = (response: PostDetailResponse): PostWriteInitialData => ({
	authorId: response.author.userId,
	document: {
		title: response.title,
		blocks: (Array.isArray(response.content) ? response.content : []) as Block[],
	},
	settings: {
		category: mapPostCategory(response.category),
		blog:
			response.owner.type === 'COLOG'
				? { type: 'COLOG', id: response.owner.blogId, slug: response.owner.slug }
				: { type: 'RILOG', slug: response.owner.slug },
		chapterId: response.chapter?.chapterId ?? null,
		representativeImage: null,
		representativeImageUrl: response.thumbnailImageUrl,
	},
});
