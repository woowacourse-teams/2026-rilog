import type { BlogHomeIndex } from '@/features/blog-home-index/model/blog-home-index';
import type { BlogIndexResponse } from '@/shared/api/blogs/types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const mapBlogIndexResponse = (response: BlogIndexResponse): BlogHomeIndex => ({
	totalCount: response.totalCount,
	chapterIndexes: (response.chapterIndexes ?? []).map((chapter) => ({
		id: chapter.chapterId,
		name: chapter.name,
		postCount: chapter.postCount,
	})),
	cologIndexes: (response.cologIndexes ?? []).map((colog) => ({
		id: colog.cologId,
		slug: stripAtPrefix(colog.slug),
		name: colog.name,
		profileImageUrl: colog.profileImageUrl?.trim() || null,
		postCount: colog.authoredPostCount,
	})),
});
