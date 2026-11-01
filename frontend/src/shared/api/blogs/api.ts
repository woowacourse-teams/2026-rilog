import type {
	BlogProfileUpdateRequest,
	BlogIndexResponse,
	BlogPublicProfileResponse,
	ChapterCreateRequest,
	ChapterRenameRequest,
	ChapterResponse,
	PublicBlogFeedPostResponse,
	PublicBlogFeedPostsRequest,
	PublicBlogChapterPostsRequest,
} from '@/shared/api/blogs/types';
import { apiClient, apiRequest, kyInstance } from '@/shared/api/client';
import { isRecord, parseApiJsonResponse } from '@/shared/api/response-validation';
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

export const readPublicBlogPosts = ({ slug, page, size, filter }: PublicBlogFeedPostsRequest) => {
	const normalizedSlug = stripAtPrefix(slug);
	const filterSearchParams =
		filter.type === 'chapterId'
			? { chapterId: filter.chapterId }
			: filter.type === 'targetCologSlug'
				? { targetCologSlug: filter.targetCologSlug }
				: {};

	return apiClient.get<ApiResponse<PublicBlogFeedPostResponse>>(
		`v1/blogs/${encodeURIComponent(normalizedSlug)}/posts`,
		{
			searchParams: {
				page,
				size,
				...filterSearchParams,
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

const isCount = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isId = (value: unknown): value is number => isCount(value) && value > 0;
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const isBlogType = (value: unknown) => value === 'RILOG' || value === 'COLOG';
const isChapter = (value: unknown) =>
	isRecord(value) && isId(value.chapterId) && typeof value.name === 'string' && isCount(value.order);
const isPublicBlogChapterPostsResponse = (value: unknown): value is PublicBlogFeedPostResponse =>
	isRecord(value) &&
	isBlogType(value.type) &&
	isCount(value.page) &&
	isCount(value.size) &&
	isCount(value.numberOfElements) &&
	typeof value.hasNext === 'boolean' &&
	Array.isArray(value.posts) &&
	value.posts.every((post: unknown) => {
		if (!isRecord(post) || !isRecord(post.author) || !isRecord(post.owner)) return false;
		const { author, owner } = post;
		return (
			isId(post.postId) &&
			typeof post.title === 'string' &&
			isCount(post.totalCommentsCount) &&
			isNullableString(post.thumbnailImageUrl) &&
			(post.category === '기술' || post.category === '일상' || post.category === '회고') &&
			(post.chapter === null || isChapter(post.chapter)) &&
			(post.visibility === 'PUBLIC' || post.visibility === 'PRIVATE') &&
			typeof post.publishedAt === 'string' &&
			isId(author.userId) &&
			typeof author.nickname === 'string' &&
			typeof author.slug === 'string' &&
			isNullableString(author.profileImageUrl) &&
			isBlogType(owner.type) &&
			isId(owner.blogId) &&
			typeof owner.slug === 'string' &&
			typeof owner.name === 'string' &&
			isNullableString(owner.profileImageUrl)
		);
	});

export const readPublicBlogChapterPosts = ({ slug, chapterId, page, size }: PublicBlogChapterPostsRequest) => {
	const normalizedSlug = stripAtPrefix(slug);
	const url = `v1/blogs/${encodeURIComponent(normalizedSlug)}/chapters/${chapterId}/posts`;
	return apiRequest(
		async () => {
			const response = await kyInstance.get(url, { searchParams: { page, size } });
			return parseApiJsonResponse(response, 'readPublicBlogChapterPosts', isPublicBlogChapterPostsResponse);
		},
		{ method: 'GET', url },
	);
};
