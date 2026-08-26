import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as blogsApi from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

import { useUpdateBlogProfileMutation } from './use-update-blog-profile-mutation';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('useUpdateBlogProfileMutation', () => {
	it('프로필 수정 후 관련 캐시를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const updateBlogProfile = vi.spyOn(blogsApi, 'updateBlogProfile').mockResolvedValue({
			status: 200,
			message: '팀 프로필을 수정했습니다.',
		});
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

		const { result } = renderHook(() => useUpdateBlogProfileMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});
		const request = {
			name: '리로그 팀',
			profileImageUrl: 'rilog/uploads/images/logo.png',
			coverImageUrl: null,
			introduction: '함께 기록하는 팀',
			serviceUrl: null,
			githubUrl: null,
		};

		await result.current.mutateAsync({ slug: 'rilog-team', request });

		expect(updateBlogProfile).toHaveBeenCalledWith('rilog-team', request);
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: feedsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: usersQueryKeys.myCologsPreview() });
	});
});
