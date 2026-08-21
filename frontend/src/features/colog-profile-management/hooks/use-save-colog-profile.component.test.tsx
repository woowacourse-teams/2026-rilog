import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CologProfileSettingsValue } from '../model/colog-profile-settings';
import type { ReactNode } from 'react';

import * as uploadApi from '@/shared/api/uploads/api';

import { useSaveCologProfile } from './use-save-colog-profile';

const { updateCologProfileMock } = vi.hoisted(() => ({ updateCologProfileMock: vi.fn() }));

vi.mock('@/shared/api/cologs/mutations/use-update-colog-profile-mutation', () => ({
	useUpdateCologProfileMutation: () => ({ mutateAsync: updateCologProfileMock }),
}));

const createWrapper = () => {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

	return ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
};

afterEach(() => {
	updateCologProfileMock.mockReset();
	vi.restoreAllMocks();
});

describe('useSaveCologProfile', () => {
	it('변경한 로고와 커버를 업로드한 objectKey로 프로필을 저장한다', async () => {
		const uploadFile = vi.spyOn(uploadApi, 'uploadFileWithPresignedUrl');
		uploadFile.mockResolvedValueOnce({
			uploadId: 'logo-upload-id',
			objectKey: 'rilog/uploads/images/logo.png',
			uploadUrl: 'https://s3.rilog.test/logo',
			headers: {},
			expiresAt: '2026-08-21T00:00:00Z',
		});
		uploadFile.mockResolvedValueOnce({
			uploadId: 'cover-upload-id',
			objectKey: 'rilog/uploads/images/cover.png',
			uploadUrl: 'https://s3.rilog.test/cover',
			headers: {},
			expiresAt: '2026-08-21T00:00:00Z',
		});
		updateCologProfileMock.mockResolvedValue({ status: 200, message: '팀 프로필을 수정했습니다.' });
		const logoFile = new File(['logo'], 'logo.png', { type: 'image/png' });
		const coverImageFile = new File(['cover'], 'cover.png', { type: 'image/png' });
		const value: CologProfileSettingsValue = {
			name: '리로그 팀',
			slug: 'rilog-team',
			description: '함께 기록하는 팀',
			profileImageUrl: 'old-logo.png',
			coverImageUrl: 'old-cover.png',
			serviceUrl: '',
			githubUrl: '',
			logoFile,
			coverImageFile,
		};

		const { result } = renderHook(() => useSaveCologProfile(), { wrapper: createWrapper() });
		const savedValue = await result.current.mutateAsync({ slug: '@rilog-team', value });

		expect(uploadFile).toHaveBeenCalledWith({ file: logoFile, type: 'IMAGE' });
		expect(uploadFile).toHaveBeenCalledWith({ file: coverImageFile, type: 'IMAGE' });
		expect(updateCologProfileMock).toHaveBeenCalledWith({
			slug: '@rilog-team',
			request: {
				name: '리로그 팀',
				profileImageUrl: 'rilog/uploads/images/logo.png',
				coverImageUrl: 'rilog/uploads/images/cover.png',
				introduction: '함께 기록하는 팀',
				serviceUrl: null,
				githubUrl: null,
			},
		});
		expect(savedValue).toMatchObject({
			profileImageUrl: 'rilog/uploads/images/logo.png',
			coverImageUrl: 'rilog/uploads/images/cover.png',
			logoFile: null,
			coverImageFile: null,
		});
	});
});
