'use client';

import { useState } from 'react';

import type { CompleteSignUp, SignUpValidationErrors } from '../model/sign-up';
import type { ChangeEvent, SubmitEvent } from 'react';

import { mockCompleteSignUp } from '../lib/mock-complete-sign-up';
import {
	normalizeSignUpFields,
	validateSignUpFields,
	validateSignUpNickname,
	validateSignUpSlug,
} from '../lib/validate-sign-up';

type RequiredTextField = 'nickname' | 'slug';

const getFormDataText = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '');

export type SignUpState = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

export interface SignUpNavigateOptions {
	replace?: boolean;
}

interface UseSignUpFormOptions {
	completeSignUp?: CompleteSignUp;
	navigate?: (href: string, options?: SignUpNavigateOptions) => void;
}

export function useSignUpForm({ completeSignUp = mockCompleteSignUp, navigate }: UseSignUpFormOptions = {}) {
	const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
	const [description, setDescription] = useState('');
	const [signUpState, setSignUpState] = useState<SignUpState>({ status: 'idle' });
	const [validationErrors, setValidationErrors] = useState<SignUpValidationErrors>({});
	const [isTermsAgreed, setIsTermsAgreed] = useState(false);

	const isSigningUp = signUpState.status === 'pending';

	const clearSignUpError = () => {
		setSignUpState((currentState) => (currentState.status === 'error' ? { status: 'idle' } : currentState));
	};

	const handleImageChange = (file: File | null) => {
		setProfileImageFile(file);
		clearSignUpError();
	};

	const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setDescription(event.currentTarget.value);
		clearSignUpError();
	};

	const handleTermsAgreementChange = (event: ChangeEvent<HTMLInputElement>) => {
		setIsTermsAgreed(event.currentTarget.checked);
		clearSignUpError();
	};

	const handleRequiredTextChange = (event: ChangeEvent<HTMLInputElement>) => {
		const field = event.currentTarget.name;
		if (field === 'nickname' || field === 'slug') {
			setValidationErrors((current) => ({ ...current, [field]: undefined }));
		}
		clearSignUpError();
	};

	const validateRequiredTextField = (field: RequiredTextField, value: string) => {
		const error = field === 'nickname' ? validateSignUpNickname(value) : validateSignUpSlug(value);
		setValidationErrors((current) => ({ ...current, [field]: error }));

		return error === undefined;
	};

	const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isSigningUp) {
			return;
		}

		const formData = new FormData(event.currentTarget);
		const { nickname, slug } = normalizeSignUpFields({
			nickname: getFormDataText(formData.get('nickname')),
			slug: getFormDataText(formData.get('slug')),
		});
		const nextValidationErrors = validateSignUpFields({ nickname, slug });
		const nicknameInput = event.currentTarget.elements.namedItem('nickname');
		const slugInput = event.currentTarget.elements.namedItem('slug');

		setValidationErrors(nextValidationErrors);

		if (nextValidationErrors.nickname !== undefined) {
			if (nicknameInput instanceof HTMLInputElement) {
				nicknameInput.focus();
			}
			return;
		}

		if (nextValidationErrors.slug !== undefined) {
			if (slugInput instanceof HTMLInputElement) {
				slugInput.focus();
			}
			return;
		}

		if (!event.currentTarget.checkValidity()) {
			event.currentTarget.reportValidity();
			return;
		}

		setSignUpState({ status: 'pending' });

		try {
			await completeSignUp({ nickname, slug, description: description.trim(), profileImageFile });

			if (navigate !== undefined) {
				navigate('/', { replace: true });
				return;
			}

			window.location.replace('/');
		} catch (error) {
			setSignUpState({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: '회원가입을 완료하지 못했습니다. 입력한 내용은 유지되며 다시 시도할 수 있습니다.',
			});
		}
	};

	return {
		profileImageFile,
		description,
		signUpState,
		validationErrors,
		isTermsAgreed,
		isSigningUp,
		clearSignUpError,
		handleImageChange,
		handleDescriptionChange,
		handleTermsAgreementChange,
		handleRequiredTextChange,
		validateRequiredTextField,
		handleSubmit,
	};
}
