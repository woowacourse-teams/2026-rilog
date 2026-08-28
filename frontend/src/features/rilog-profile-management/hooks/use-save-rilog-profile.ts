'use client';

import { useMutation } from '@tanstack/react-query';

import { mapRilogProfileUpdateRequest } from '@/features/rilog-profile-management/lib/map-rilog-profile-update-request';
import type { RilogProfileSettingsValue } from '@/features/rilog-profile-management/model/rilog-profile-settings';
import { useUpdateBlogProfileMutation } from '@/shared/api/blogs/mutations/use-update-blog-profile-mutation';
import { uploadFileWithPresignedUrl } from '@/shared/api/uploads/api';

interface SaveRilogProfileVariables {
	slug: string;
	value: RilogProfileSettingsValue;
}

export const useSaveRilogProfile = () => {
	const updateBlogProfile = useUpdateBlogProfileMutation();

	return useMutation<RilogProfileSettingsValue, Error, SaveRilogProfileVariables>({
		mutationFn: async ({ slug, value }) => {
			const profileImageUpload =
				value.profileImageFile === null
					? undefined
					: await uploadFileWithPresignedUrl({ file: value.profileImageFile, type: 'IMAGE' });
			const profileImageUrl = profileImageUpload?.objectKey ?? value.profileImageUrl ?? '';

			await updateBlogProfile.mutateAsync({
				slug,
				request: mapRilogProfileUpdateRequest(value, profileImageUrl),
			});

			return {
				...value,
				profileImageUrl,
				profileImageFile: null,
			};
		},
	});
};
