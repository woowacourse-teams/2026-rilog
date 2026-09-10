import type { Block } from '@blocknote/core';

import { mapPostCategoryResponse } from '@/features/post-detail/lib/map-post-category-response';
import type { PostWriteInitialData } from '@/features/post-write/model/post-publication';
import type { PostDetailResponse } from '@/shared/api/posts/types';

export const mapPostDetailToPostWriteInitialData = (response: PostDetailResponse): PostWriteInitialData => ({
	authorId: response.author.userId,
	document: {
		title: response.title,
		blocks: (Array.isArray(response.content) ? response.content : []) as Block[],
	},
	settings: {
		category: mapPostCategoryResponse(response.category),
		blog:
			response.owner.type === 'COLOG'
				? { type: 'COLOG', id: response.owner.blogId, slug: response.owner.slug }
				: { type: 'RILOG', slug: response.owner.slug },
		chapterId: response.chapter?.chapterId ?? null,
		representativeImage: null,
		representativeImageUrl: response.thumbnailImageUrl,
	},
});
