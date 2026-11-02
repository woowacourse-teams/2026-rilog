'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import type { ApiResponse } from '@/shared/api/shared.types';
import { importImage } from '@/shared/api/uploads/api';
import type { ImageImportRequest, ImageImportResponse } from '@/shared/api/uploads/types';

export interface UseImportImageMutationOptions {
	mutationOptions?: UseMutationOptions<ApiResponse<ImageImportResponse>, Error, ImageImportRequest>;
}

export const useImportImageMutation = ({ mutationOptions }: UseImportImageMutationOptions = {}) =>
	useMutation({
		mutationFn: (request: ImageImportRequest) => importImage(request),
		...mutationOptions,
	});
