'use client';

import { useMutation } from '@tanstack/react-query';

import { mapCologProfileUpdateRequest } from '@/features/colog-profile-management/lib/map-colog-profile-update-request';
import type { CologProfileSettingsValue } from '@/features/colog-profile-management/model/colog-profile-settings';
import { useUpdateCologProfileMutation } from '@/shared/api/cologs/mutations/use-update-colog-profile-mutation';
import { uploadFileWithPresignedUrl } from '@/shared/api/uploads/api';

interface SaveCologProfileVariables {
	slug: string;
	value: CologProfileSettingsValue;
}

export const useSaveCologProfile = () => {
	const updateCologProfile = useUpdateCologProfileMutation();

	return useMutation<CologProfileSettingsValue, Error, SaveCologProfileVariables>({
		mutationFn: async ({ slug, value }) => {
			const [logoUpload, coverImageUpload] = await Promise.all([
				value.logoFile === null ? undefined : uploadFileWithPresignedUrl({ file: value.logoFile, type: 'IMAGE' }),
				value.coverImageFile === null
					? undefined
					: uploadFileWithPresignedUrl({ file: value.coverImageFile, type: 'IMAGE' }),
			]);
			const profileImageUrl = logoUpload?.objectKey ?? value.profileImageUrl ?? '';
			const coverImageUrl = coverImageUpload?.objectKey ?? value.coverImageUrl ?? '';

			await updateCologProfile.mutateAsync({
				slug,
				request: mapCologProfileUpdateRequest(value, { profileImageUrl, coverImageUrl }),
			});

			return {
				...value,
				profileImageUrl,
				coverImageUrl,
				logoFile: null,
				coverImageFile: null,
			};
		},
	});
};
