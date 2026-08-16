'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type {
	CologProfileFormValue,
	CologProfileTextField,
	CologProfileValidationErrors,
} from '../model/colog-profile-form';

import {
	EMPTY_COLOG_PROFILE_FORM_VALUE,
	normalizeCologProfileForm,
	validateCologProfileForm,
} from '../model/colog-profile-form';

export interface CologProfileFormRefs {
	logoFile: React.RefObject<HTMLInputElement | null>;
	name: React.RefObject<HTMLInputElement | null>;
	slug: React.RefObject<HTMLInputElement | null>;
	introduction: React.RefObject<HTMLTextAreaElement | null>;
	serviceUrl: React.RefObject<HTMLInputElement | null>;
	githubUrl: React.RefObject<HTMLInputElement | null>;
	email: React.RefObject<HTMLInputElement | null>;
}

interface UseCologProfileFormOptions {
	initialValue?: CologProfileFormValue;
}

const cloneFormValue = (value: CologProfileFormValue): CologProfileFormValue => ({ ...value });

export const useCologProfileForm = ({
	initialValue = EMPTY_COLOG_PROFILE_FORM_VALUE,
}: UseCologProfileFormOptions = {}) => {
	const logoFileRef = useRef<HTMLInputElement>(null);
	const nameRef = useRef<HTMLInputElement>(null);
	const slugRef = useRef<HTMLInputElement>(null);
	const introductionRef = useRef<HTMLTextAreaElement>(null);
	const serviceUrlRef = useRef<HTMLInputElement>(null);
	const githubUrlRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);
	const refs: CologProfileFormRefs = useMemo(
		() => ({
			logoFile: logoFileRef,
			name: nameRef,
			slug: slugRef,
			introduction: introductionRef,
			serviceUrl: serviceUrlRef,
			githubUrl: githubUrlRef,
			email: emailRef,
		}),
		[],
	);
	const [value, setValue] = useState(() => cloneFormValue(initialValue));
	const [errors, setErrors] = useState<CologProfileValidationErrors>({});

	const updateTextField = useCallback((field: CologProfileTextField, fieldValue: string) => {
		setValue((currentValue) => ({ ...currentValue, [field]: fieldValue }));
		setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
	}, []);

	const updateLogoFile = useCallback((logoFile: File | null) => {
		setValue((currentValue) => ({ ...currentValue, logoFile }));
		setErrors((currentErrors) => ({ ...currentErrors, logoFile: undefined }));
	}, []);

	const updateCoverImageFile = useCallback((coverImageFile: File | null) => {
		setValue((currentValue) => ({ ...currentValue, coverImageFile }));
	}, []);

	const focusFirstError = useCallback(
		(nextErrors: CologProfileValidationErrors) => {
			const errorFocusOrder = [
				['logoFile', refs.logoFile],
				['name', refs.name],
				['slug', refs.slug],
				['introduction', refs.introduction],
				['serviceUrl', refs.serviceUrl],
				['githubUrl', refs.githubUrl],
				['email', refs.email],
			] as const;
			const firstInvalidFieldRef = errorFocusOrder.find(([field]) => nextErrors[field] !== undefined)?.[1];

			firstInvalidFieldRef?.current?.focus();
		},
		[refs],
	);

	const validate = useCallback(() => {
		const normalizedValue = normalizeCologProfileForm(value);
		const nextErrors = validateCologProfileForm(normalizedValue);

		setValue(normalizedValue);
		setErrors(nextErrors);

		if (Object.keys(nextErrors).length > 0) {
			focusFirstError(nextErrors);
			return null;
		}

		return normalizedValue;
	}, [focusFirstError, value]);

	const reset = useCallback((nextValue: CologProfileFormValue = EMPTY_COLOG_PROFILE_FORM_VALUE) => {
		setValue(cloneFormValue(nextValue));
		setErrors({});
	}, []);

	return {
		value,
		errors,
		refs,
		updateTextField,
		updateLogoFile,
		updateCoverImageFile,
		validate,
		reset,
	};
};
