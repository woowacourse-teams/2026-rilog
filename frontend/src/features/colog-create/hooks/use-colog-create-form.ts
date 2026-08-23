import { useMemo, useRef, useState } from 'react';

import type { CologCreateValue, CologProfileTextField, CologProfileValidationErrors } from '../model/colog-create';
import type { RefObject } from 'react';

import {
	normalizeCologCreateValue,
	normalizeCologName,
	normalizeCologSlug,
	validateCologCreateValue,
	validateCologName,
	validateCologSlug,
} from '../lib/validate-colog-create';
import { INITIAL_COLOG_CREATE_VALUE } from '../model/colog-create';

export interface CologCreateFormRefs {
	logoFile: RefObject<HTMLInputElement | null>;
	name: RefObject<HTMLInputElement | null>;
	slug: RefObject<HTMLInputElement | null>;
	description: RefObject<HTMLTextAreaElement | null>;
	serviceUrl: RefObject<HTMLInputElement | null>;
	githubUrl: RefObject<HTMLInputElement | null>;
}

interface UseCologCreateFormOptions {
	initialValue?: CologCreateValue;
}

export function useCologCreateForm(options: UseCologCreateFormOptions = {}) {
	const [value, setValue] = useState<CologCreateValue>(() => options.initialValue ?? INITIAL_COLOG_CREATE_VALUE);
	const [errors, setErrors] = useState<CologProfileValidationErrors>({});

	const logoRef = useRef<HTMLInputElement | null>(null);
	const nameRef = useRef<HTMLInputElement | null>(null);
	const slugRef = useRef<HTMLInputElement | null>(null);
	const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
	const serviceUrlRef = useRef<HTMLInputElement | null>(null);
	const githubUrlRef = useRef<HTMLInputElement | null>(null);

	const refs: CologCreateFormRefs = useMemo(
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

	const validate = (): CologCreateValue | null => {
		const validationErrors = validateCologCreateValue(value);
		setErrors(validationErrors);

		const firstErrorField = (Object.keys(validationErrors) as (CologProfileTextField | 'logoFile')[])[0];
		if (firstErrorField !== undefined) {
			refs[firstErrorField].current?.focus();
			return null;
		}

		return normalizeCologCreateValue(value);
	};

	const validateSlug = (): string | null => {
		const slugError = validateCologSlug(value.slug);
		setErrors((current) => {
			const nextErrors = { ...current };
			if (slugError === undefined) {
				delete nextErrors.slug;
			} else {
				nextErrors.slug = slugError;
			}
			return nextErrors;
		});

		if (slugError !== undefined) {
			refs.slug.current?.focus();
			return null;
		}

		return normalizeCologSlug(value.slug);
	};

	const validateName = (): string | null => {
		const nameError = validateCologName(value.name);
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

		return normalizeCologName(value.name);
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
		validateSlug,
		setValue,
	};
}
