import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import * as uploadApi from '../api';

import { useUploadFileMutation } from './use-upload-file-mutation';

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			mutations: { retry: false },
		},
	});

	function TestQueryProviderWrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return TestQueryProviderWrapper;
};

describe('useUploadFileMutation', () => {
	it('uploadFileWithPresignedUrl을 mutationFn으로 실행한다', async () => {
		const mockResult = {
			uploadId: 'upload-id-123',
			objectKey: 'rilog/uploads/images/test.png',
			uploadUrl: 'https://s3.rilog.test/upload/test.png',
			headers: { 'content-type': ['image/png'] },
			expiresAt: '2026-08-19T12:00:00Z',
		};

		const spy = vi.spyOn(uploadApi, 'uploadFileWithPresignedUrl').mockResolvedValue(mockResult);

		const { result } = renderHook(() => useUploadFileMutation(), {
			wrapper: createWrapper(),
		});

		const file = new File(['content'], 'test.png', { type: 'image/png' });
		const mutatePromise = result.current.mutateAsync({ file, type: 'IMAGE' });

		await expect(mutatePromise).resolves.toEqual(mockResult);
		expect(spy).toHaveBeenCalledWith({ file, type: 'IMAGE' });
	});
});
