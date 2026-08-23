import { useMemo, useRef, useState } from 'react';

import type {
	CologProfileFormRefs,
	CologProfileSettingsValue,
	CologProfileTextField,
	CologProfileValidationErrors,
} from '../model/colog-profile-settings';

import {
	normalizeCologProfileName,
	normalizeCologProfileSettings,
	validateCologProfileName,
	validateCologProfileSettings,
} from '../lib/validate-colog-profile-settings';
import { EMPTY_COLOG_PROFILE_SETTINGS_VALUE } from '../model/colog-profile-settings';

interface UseCologProfileFormOptions {
	initialValue?: CologProfileSettingsValue;
}

export function useCologProfileForm(options: UseCologProfileFormOptions = {}) {
	const [value, setValue] = useState<CologProfileSettingsValue>(
		() => options.initialValue ?? EMPTY_COLOG_PROFILE_SETTINGS_VALUE,
	);
	const [errors, setErrors] = useState<CologProfileValidationErrors>({});

	const logoRef = useRef<HTMLInputElement | null>(null);
	const nameRef = useRef<HTMLInputElement | null>(null);
	const slugRef = useRef<HTMLInputElement | null>(null);
	const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
	const serviceUrlRef = useRef<HTMLInputElement | null>(null);
	const githubUrlRef = useRef<HTMLInputElement | null>(null);

	const refs: CologProfileFormRefs = useMemo(
		() => ({
			logoFile: logoRef,
			name: nameRef,
			slug: slugRef,
			description: descriptionRef,
			serviceUrl: serviceUrlRef,
			githubUrl: githubUrlRef,
		}),
		[],
	);

	const updateTextField = (field: CologProfileTextField, nextValue: string) => {
		setValue((current) => ({ ...current, [field]: nextValue }));
		if (errors[field] !== undefined) {
			setErrors((current) => {
				const nextErrors = { ...current };
				delete nextErrors[field];
				return nextErrors;
			});
		}
	};

	const updateLogoFile = (file: File | null) => {
		setValue((current) => ({
			...current,
			logoFile: file,
			profileImageUrl: file === null ? '' : current.profileImageUrl,
		}));
		if (errors.logoFile !== undefined) {
			setErrors((current) => {
				const nextErrors = { ...current };
				delete nextErrors.logoFile;
				return nextErrors;
			});
		}
	};

	const updateCoverImageFile = (file: File | null) => {
		setValue((current) => ({
			...current,
			coverImageFile: file,
			coverImageUrl: file === null ? '' : current.coverImageUrl,
		}));
	};

	const validate = (): CologProfileSettingsValue | null => {
		const validationErrors = validateCologProfileSettings(value);
		setErrors(validationErrors);

		const firstErrorField = (Object.keys(validationErrors) as (CologProfileTextField | 'logoFile')[])[0];
		if (firstErrorField !== undefined) {
			refs[firstErrorField].current?.focus();
			return null;
		}

		return normalizeCologProfileSettings(value);
	};

	const validateName = (): string | null => {
		const nameError = validateCologProfileName(value.name);
		setErrors((current) => {
			const nextErrors = { ...current };
			if (nameError === undefined) {
				delete nextErrors.name;
			} else {
				nextErrors.name = nameError;
			}
			return nextErrors;
		});

		if (nameError !== undefined) {
			refs.name.current?.focus();
			return null;
		}

		return normalizeCologProfileName(value.name);
	};

	return {
		value,
		errors,
		refs,
		updateTextField,
		updateLogoFile,
		updateCoverImageFile,
		validate,
		validateName,
		setValue,
	};
}
