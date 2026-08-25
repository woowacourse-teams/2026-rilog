import type {
	BlogPublicProfileResponse,
	PostPublishResponse,
	PublishPostRequest,
	PublicBlogFeedPostResponse,
	PublicBlogFeedPostsRequest,
} from '@/shared/api/blogs/types';
import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

const DEV_RILOG_PROFILE_MOCKS: Record<string, BlogPublicProfileResponse> = {
	jetproc: {
		type: 'RILOG',
		id: 1,
		name: '파라디',
		slug: 'jetproc',
		introduction: '기록하며 성장하는 Jetproc의 기술 블로그',
		profileImageUrl: '/images/profile-placeholder.svg',
		coverImageUrl: '',
		serviceUrl: null,
		githubUrl: 'https://github.com/jetproc',
		memberCount: 1,
		postCount: 0,
	},
	azsong: {
		type: 'RILOG',
		id: 2,
		name: 'Azsong',
		slug: 'azsong',
		introduction: '배운 것을 나누고 기록하는 Azsong의 기술 블로그',
		profileImageUrl: '/images/profile-placeholder.svg',
		coverImageUrl: '',
		serviceUrl: null,
		githubUrl: 'https://github.com/azsong',
		memberCount: 1,
		postCount: 0,
	},
};

const readDevRilogProfileMock = (slug: string) =>
	process.env.NODE_ENV === 'development' ? DEV_RILOG_PROFILE_MOCKS[slug] : undefined;

export const publishPost = ({ slug, request }: PublishPostRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.post<ApiResponse<PostPublishResponse>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}/posts`, {
		json: request,
	});
};

export const readBlogPublicProfile = ({ slug }: { slug: string }): Promise<ApiResponse<BlogPublicProfileResponse>> => {
	const normalizedSlug = stripAtPrefix(slug);
	const mockProfile = readDevRilogProfileMock(normalizedSlug);

	if (mockProfile !== undefined) {
		return Promise.resolve({ status: 200, message: 'OK', data: mockProfile });
	}

	return apiClient.get<ApiResponse<BlogPublicProfileResponse>>(`v1/blogs/@${encodeURIComponent(normalizedSlug)}`);
};

export const readPublicBlogPosts = ({ slug, page, size }: PublicBlogFeedPostsRequest) => {
	const normalizedSlug = stripAtPrefix(slug);
	const mockProfile = readDevRilogProfileMock(normalizedSlug);

	if (mockProfile !== undefined) {
		return Promise.resolve<ApiResponse<PublicBlogFeedPostResponse>>({
			status: 200,
			message: 'OK',
			data: {
				type: mockProfile.type,
				posts: [],
				page,
				size,
				numberOfElements: 0,
				hasNext: false,
			},
		});
	}

	return apiClient.get<ApiResponse<PublicBlogFeedPostResponse>>(
		`v1/blogs/@${encodeURIComponent(normalizedSlug)}/posts`,
		{
			searchParams: {
				page,
				size,
			},
		},
	);
};
