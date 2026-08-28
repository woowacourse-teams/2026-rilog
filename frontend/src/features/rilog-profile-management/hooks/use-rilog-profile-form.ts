import { useMemo, useRef, useState } from 'react';

import type {
	RilogProfileFormRefs,
	RilogProfileSettingsValue,
	RilogProfileTextField,
	RilogProfileValidationErrors,
} from '../model/rilog-profile-settings';

import { normalizeUserNickname, validateUserNickname } from '@/domains/user/lib/validate-user-profile';

import { normalizeRilogProfileSettings, validateRilogProfileSettings } from '../lib/validate-rilog-profile-settings';

interface UseRilogProfileFormOptions {
	initialValue: RilogProfileSettingsValue;
}

export const useRilogProfileForm = ({ initialValue }: UseRilogProfileFormOptions) => {
	const [value, setValue] = useState<RilogProfileSettingsValue>(() => initialValue);
	const [errors, setErrors] = useState<RilogProfileValidationErrors>({});
	const profileImageFileRef = useRef<HTMLInputElement | null>(null);
	const nicknameRef = useRef<HTMLInputElement | null>(null);
	const slugRef = useRef<HTMLInputElement | null>(null);
	const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
	const serviceUrlRef = useRef<HTMLInputElement | null>(null);
	const githubUrlRef = useRef<HTMLInputElement | null>(null);

	const refs: RilogProfileFormRefs = useMemo(
		() => ({
			profileImageFile: profileImageFileRef,
			nickname: nicknameRef,
			slug: slugRef,
			description: descriptionRef,
			serviceUrl: serviceUrlRef,
			githubUrl: githubUrlRef,
		}),
		[],
	);

	const updateTextField = (field: RilogProfileTextField, nextValue: string) => {
		setValue((current) => ({ ...current, [field]: nextValue }));
		if (errors[field] !== undefined) {
			setErrors((current) => ({ ...current, [field]: undefined }));
		}
	};

	const updateProfileImageFile = (file: File | null) => {
		setValue((current) => ({
			...current,
			profileImageFile: file,
			profileImageUrl: file === null ? '' : current.profileImageUrl,
		}));
	};

	const validate = (): RilogProfileSettingsValue | null => {
		const validationErrors = validateRilogProfileSettings(value);
		setErrors(validationErrors);

		const firstErrorField = Object.keys(validationErrors)[0] as RilogProfileTextField | undefined;
		if (firstErrorField !== undefined) {
			refs[firstErrorField].current?.focus();
			return null;
		}

		return normalizeRilogProfileSettings(value);
	};

	const validateNickname = (): string | null => {
		const nicknameError = validateUserNickname(value.nickname);
		setErrors((current) => ({ ...current, nickname: nicknameError }));

		if (nicknameError !== undefined) {
			refs.nickname.current?.focus();
			return null;
		}

		return normalizeUserNickname(value.nickname);
	};

	return { value, errors, refs, updateTextField, updateProfileImageFile, validate, validateNickname, setValue };
};
