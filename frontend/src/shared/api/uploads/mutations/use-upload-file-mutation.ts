'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { uploadFileWithPresignedUrl } from '@/shared/api/uploads/api';
import type { PresignedUrlCreateResponse, UploadFileOptions } from '@/shared/api/uploads/types';

export interface UseUploadFileMutationOptions {
	mutationOptions?: UseMutationOptions<PresignedUrlCreateResponse, Error, UploadFileOptions>;
}

export const useUploadFileMutation = ({ mutationOptions }: UseUploadFileMutationOptions = {}) =>
	useMutation({
		mutationFn: (options: UploadFileOptions) => uploadFileWithPresignedUrl(options),
		...mutationOptions,
	});
