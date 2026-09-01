import type {
	BlogProfileUpdateRequest,
	BlogIndexResponse,
	BlogPublicProfileResponse,
	ChapterCreateRequest,
	ChapterRenameRequest,
	ChapterResponse,
	PublicBlogFeedPostResponse,
	PublicBlogFeedPostsRequest,
} from '@/shared/api/blogs/types';
import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const updateBlogProfile = (slug: string, request: BlogProfileUpdateRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.patch<ApiResponse<void>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}/profiles`, {
		json: request,
	});
};

export const readBlogPublicProfile = ({ slug }: { slug: string }): Promise<ApiResponse<BlogPublicProfileResponse>> => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<BlogPublicProfileResponse>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}`);
};

export const readBlogIndex = (slug: string) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<BlogIndexResponse>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}/index`);
};

export const readPublicBlogPosts = ({ slug, page, size }: PublicBlogFeedPostsRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<PublicBlogFeedPostResponse>>(
		`v1/blogs/${encodeURIComponent(normalizedSlug)}/posts`,
		{
			searchParams: {
				page,
				size,
			},
		},
	);
};

export const readBlogChapters = (slug: string) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<ChapterResponse[]>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}/chapters`);
};

export const createBlogChapter = (slug: string, request: ChapterCreateRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.post<ApiResponse<ChapterResponse>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}/chapters`, {
		json: request,
	});
};

export const renameBlogChapter = (slug: string, chapterId: number, request: ChapterRenameRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.patch<ApiResponse<ChapterResponse>>(
		`v1/blogs/${encodeURIComponent(normalizedSlug)}/chapters/${chapterId}`,
		{ json: request },
	);
};

export const deleteBlogChapter = (slug: string, chapterId: number) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.delete(`v1/blogs/${encodeURIComponent(normalizedSlug)}/chapters/${chapterId}`);
};
