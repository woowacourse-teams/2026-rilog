'use client';

import { useState } from 'react';

import type { CompleteSignUp } from '../model/sign-up';
import type { ChangeEvent, SubmitEvent } from 'react';

import { mockCompleteSignUp } from '../lib/mock-complete-sign-up';
import { validateSignUpFields } from '../lib/validate-sign-up';

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

	const handleRequiredTextChange = (event: ChangeEvent<HTMLInputElement>) => {
		event.currentTarget.setCustomValidity('');
		clearSignUpError();
	};

	const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isSigningUp) {
			return;
		}

		const formData = new FormData(event.currentTarget);
		const nickname = getFormDataText(formData.get('nickname')).trim();
		const slug = getFormDataText(formData.get('slug')).trim();
		const validationErrors = validateSignUpFields({ nickname, slug });
		const nicknameInput = event.currentTarget.elements.namedItem('nickname');
		const slugInput = event.currentTarget.elements.namedItem('slug');

		if (nicknameInput instanceof HTMLInputElement) {
			nicknameInput.setCustomValidity(validationErrors.nickname ?? '');
		}
		if (slugInput instanceof HTMLInputElement) {
			slugInput.setCustomValidity(validationErrors.slug ?? '');
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
		isSigningUp,
		clearSignUpError,
		handleImageChange,
		handleDescriptionChange,
		handleRequiredTextChange,
		handleSubmit,
	};
}
