import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CologCreateValue } from '@/features/colog-create/model/colog-create';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { createColog } from '@/shared/api/cologs/api';
import { getInvalidCologInputFields } from '@/shared/api/cologs/input-validation';
import type { CologCreateRequest, CologCreateResponse } from '@/shared/api/cologs/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { uploadFileWithPresignedUrl } from '@/shared/api/uploads/api';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

export const useCreateCologMutation = () => {
	const queryClient = useQueryClient();

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
		meta: { errorTracking: 'local' },
		onError: (error, variables) =>
			apiErrorReporter.report(error, {
				operation: 'colog.create',
				invalidUserInputFields: getInvalidCologInputFields({
					name: variables.name,
					slug: variables.slug,
					introduction: variables.description,
					serviceUrl: variables.serviceUrl,
					githubUrl: variables.githubUrl,
				}),
			}),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: usersQueryKeys.myCologsOverview() }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
			]),
	});
};
