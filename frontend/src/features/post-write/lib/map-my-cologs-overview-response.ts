import type { PostPublishCologOption } from '@/features/post-write/model/post-publication';
import type { MyCologOverviewResponse } from '@/shared/api/users/types';

import { mapBlogChapterResponse } from './map-blog-chapter-response';

export const mapMyCologsOverviewResponse = (cologs: MyCologOverviewResponse[]): PostPublishCologOption[] =>
	cologs.map(({ cologId, slug, name, chapters }) => ({
		id: cologId,
		slug,
		name,
		chapters: mapBlogChapterResponse(chapters),
	}));
