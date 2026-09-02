import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

import * as cologsApi from '../api';

import { useCreateCologMutation } from './use-create-colog-mutation';

const createWrapper = (queryClient: QueryClient) => {
	function TestQueryProviderWrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return TestQueryProviderWrapper;
};

describe('useCreateCologMutation', () => {
	it('Co-log 생성 성공 후 내 Co-log 목록과 블로그 인덱스 캐시를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		vi.spyOn(cologsApi, 'createColog').mockResolvedValue({
			status: 201,
			message: 'Co-log가 생성되었습니다.',
			data: { id: 1, name: 'Rilog Team', slug: 'rilog-team' },
		});
		const { result } = renderHook(() => useCreateCologMutation(), { wrapper: createWrapper(queryClient) });

		await result.current.mutateAsync({
			name: 'Rilog Team',
			slug: 'rilog-team',
			description: '',
			profileImageUrl: '',
			coverImageUrl: '',
			serviceUrl: '',
			githubUrl: '',
			logoFile: null,
			coverImageFile: null,
		});

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: usersQueryKeys.myCologsOverview() });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledTimes(2);
	});
});
