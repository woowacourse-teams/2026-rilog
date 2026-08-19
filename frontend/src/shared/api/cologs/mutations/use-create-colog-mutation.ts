import { useMutation } from '@tanstack/react-query';

import { createColog } from '@/shared/api/cologs/api';
import type { CologCreateRequest, CologCreateResponse } from '@/shared/api/cologs/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { uploadFileWithPresignedUrl } from '@/shared/api/uploads/api';

import type { CologCreateValue } from '@/features/colog-create/model/colog-create';

export const useCreateCologMutation = () => {
	return useMutation<ApiResponse<CologCreateResponse>, Error, CologCreateValue>({
		mutationFn: async (value: CologCreateValue) => {
			let profileImageUrl = value.profileImageUrl || undefined;
			let coverImageUrl = value.coverImageUrl || undefined;

			if (value.logoFile) {
				const uploadResult = await uploadFileWithPresignedUrl({ file: value.logoFile, type: 'IMAGE' });
				profileImageUrl = uploadResult.objectKey;
			}

			if (value.coverImageFile) {
				const uploadResult = await uploadFileWithPresignedUrl({ file: value.coverImageFile, type: 'IMAGE' });
				coverImageUrl = uploadResult.objectKey;
			}

			const request: CologCreateRequest = {
				name: value.name,
				slug: value.slug,
				introduction: value.description || undefined,
				profileImageUrl,
				coverImageUrl,
				serviceUrl: value.serviceUrl || undefined,
				githubUrl: value.githubUrl || undefined,
			};

			return createColog(request);
		},
	});
};
