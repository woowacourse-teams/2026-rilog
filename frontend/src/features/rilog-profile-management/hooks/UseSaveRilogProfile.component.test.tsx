import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RilogProfileSettingsValue } from '../model/rilog-profile-settings';
import type { ReactNode } from 'react';

import * as uploadApi from '@/shared/api/uploads/api';

import { useSaveRilogProfile } from './use-save-rilog-profile';

const { updateBlogProfileMock } = vi.hoisted(() => ({ updateBlogProfileMock: vi.fn() }));

vi.mock('@/shared/api/blogs/mutations/use-update-blog-profile-mutation', () => ({
	useUpdateBlogProfileMutation: () => ({ mutateAsync: updateBlogProfileMock }),
}));

const createWrapper = () => {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

	function QueryProviderWrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return QueryProviderWrapper;
};

afterEach(() => {
	updateBlogProfileMock.mockReset();
	vi.restoreAllMocks();
});

describe('useSaveRilogProfile', () => {
	it('변경한 프로필 이미지를 업로드한 objectKey로 개인 프로필을 저장한다', async () => {
		const uploadFile = vi.spyOn(uploadApi, 'uploadFileWithPresignedUrl').mockResolvedValue({
			uploadId: 'profile-upload-id',
			objectKey: 'rilog/uploads/images/profile.png',
			uploadUrl: 'https://s3.rilog.test/profile',
			headers: {},
			expiresAt: '2026-08-21T00:00:00Z',
		});
		updateBlogProfileMock.mockResolvedValue({ status: 200, message: '개인 프로필을 수정했습니다.' });
		const profileImageFile = new File(['profile'], 'profile.png', { type: 'image/png' });
		const value: RilogProfileSettingsValue = {
			nickname: '리로거',
			slug: 'rilogger',
			description: '기록하는 개발자',
			profileImageUrl: 'old-profile.png',
			serviceUrl: '',
			githubUrl: 'https://github.com/rilog',
			profileImageFile,
		};

		const { result } = renderHook(() => useSaveRilogProfile(), { wrapper: createWrapper() });
		const savedValue = await result.current.mutateAsync({ slug: '@rilogger', value });

		expect(uploadFile).toHaveBeenCalledWith({ file: profileImageFile, type: 'IMAGE' });
		expect(updateBlogProfileMock).toHaveBeenCalledWith({
			slug: '@rilogger',
			request: {
				name: '리로거',
				profileImageUrl: 'rilog/uploads/images/profile.png',
				coverImageUrl: null,
				introduction: '기록하는 개발자',
				serviceUrl: null,
				githubUrl: 'https://github.com/rilog',
			},
		});
		expect(savedValue).toMatchObject({
			profileImageUrl: 'rilog/uploads/images/profile.png',
			profileImageFile: null,
		});
	});
});
