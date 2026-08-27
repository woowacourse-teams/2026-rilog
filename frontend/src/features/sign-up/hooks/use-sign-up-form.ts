'use client';

import { useRef, useState } from 'react';

import type { CompleteSignUp, SignUpValidationErrors } from '../model/sign-up';
import type { ChangeEvent, SubmitEvent } from 'react';

import { analytics } from '@/features/analytics/model/events';

import { mockCompleteSignUp } from '../lib/mock-complete-sign-up';
import { clearSignUpFlow } from '../lib/sign-up-flow-session';
import {
	normalizeSignUpFields,
	validateSignUpFields,
	validateSignUpNickname,
	validateSignUpSlug,
} from '../lib/validate-sign-up';

type RequiredTextField = 'nickname' | 'slug';
type SocialLinkField = 'serviceUrl' | 'githubUrl';

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
	const [serviceUrl, setServiceUrl] = useState('');
	const [githubUrl, setGithubUrl] = useState('');
	const [signUpState, setSignUpState] = useState<SignUpState>({ status: 'idle' });
	const [validationErrors, setValidationErrors] = useState<SignUpValidationErrors>({});
	const [isTermsAgreed, setIsTermsAgreed] = useState(false);
	const serviceUrlRef = useRef<HTMLInputElement>(null);
	const githubUrlRef = useRef<HTMLInputElement>(null);

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

	const handleSocialLinkChange = (field: SocialLinkField, value: string) => {
		if (field === 'serviceUrl') {
			setServiceUrl(value);
		} else {
			setGithubUrl(value);
		}
		setValidationErrors((current) => ({ ...current, [field]: undefined }));
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
		const normalizedValue = normalizeSignUpFields({
			nickname: getFormDataText(formData.get('nickname')),
			slug: getFormDataText(formData.get('slug')),
			serviceUrl,
			githubUrl,
		});
		const nextValidationErrors = validateSignUpFields(normalizedValue);
		const { nickname, slug } = normalizedValue;
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

		if (nextValidationErrors.serviceUrl !== undefined) {
			serviceUrlRef.current?.focus();
			return;
		}

		if (nextValidationErrors.githubUrl !== undefined) {
			githubUrlRef.current?.focus();
			return;
		}

		if (!event.currentTarget.checkValidity()) {
			event.currentTarget.reportValidity();
			return;
		}

		setSignUpState({ status: 'pending' });

		try {
			await completeSignUp({
				nickname,
				slug,
				description: description.trim(),
				serviceUrl: normalizedValue.serviceUrl,
				githubUrl: normalizedValue.githubUrl,
				profileImageFile,
			});
			analytics.signUpCompleted({
				hasProfileImage: profileImageFile !== null,
				hasIntroduction: description.trim() !== '',
			});
			clearSignUpFlow();

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
		serviceUrl,
		githubUrl,
		serviceUrlRef,
		githubUrlRef,
		signUpState,
		validationErrors,
		isTermsAgreed,
		isSigningUp,
		clearSignUpError,
		handleImageChange,
		handleDescriptionChange,
		handleSocialLinkChange,
		handleTermsAgreementChange,
		handleRequiredTextChange,
		validateRequiredTextField,
		handleSubmit,
	};
}
