import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import * as uploadsApi from '@/shared/api/uploads/api';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';
import { createTestQueryClient } from '@/test/render-with-query';

import * as cologsApi from '../api';

import { useCreateCologMutation } from './use-create-colog-mutation';

const createWrapper = (queryClient: QueryClient) => {
	function TestQueryProviderWrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return TestQueryProviderWrapper;
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('useCreateCologMutation', () => {
	it('로고와 커버 이미지로 Co-log를 생성하면 로고만 프로필 이미지로 업로드한다', async () => {
		const logoFile = new File(['logo'], 'logo.png', { type: 'image/png' });
		const coverImageFile = new File(['cover'], 'cover.png', { type: 'image/png' });
		const uploadResponse = {
			uploadId: 'upload-id',
			objectKey: 'profile-key',
			uploadUrl: 'https://s3.rilog.test/profile',
			headers: {},
			expiresAt: '2026-11-01T00:00:00Z',
		};
		const uploadProfileImage = vi
			.spyOn(uploadsApi, 'uploadProfileImageWithPresignedUrl')
			.mockResolvedValue(uploadResponse);
		const uploadContentImage = vi
			.spyOn(uploadsApi, 'uploadFileWithPresignedUrl')
			.mockResolvedValue({ ...uploadResponse, objectKey: 'cover-key' });
		const createColog = vi.spyOn(cologsApi, 'createColog').mockResolvedValue({
			status: 201,
			message: 'Co-log가 생성되었습니다.',
			data: { id: 1, name: 'Rilog Team', slug: 'rilog-team' },
		});
		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useCreateCologMutation(), { wrapper: createWrapper(queryClient) });

		await result.current.mutateAsync({
			name: 'Rilog Team',
			slug: 'rilog-team',
			description: '',
			profileImageUrl: '',
			coverImageUrl: '',
			serviceUrl: '',
			githubUrl: '',
			logoFile,
			coverImageFile,
		});

		expect(uploadProfileImage).toHaveBeenCalledWith({ file: logoFile, type: 'IMAGE' });
		expect(uploadContentImage).toHaveBeenCalledWith({ file: coverImageFile, type: 'IMAGE' });
		expect(createColog).toHaveBeenCalledWith(
			expect.objectContaining({
				profileImageUrl: 'profile-key',
				coverImageUrl: 'cover-key',
			}),
		);
	});

	it('Co-log 생성 성공 후 내 Co-log 목록과 블로그 인덱스 캐시를 무효화한다', async () => {
		const queryClient = createTestQueryClient();
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
