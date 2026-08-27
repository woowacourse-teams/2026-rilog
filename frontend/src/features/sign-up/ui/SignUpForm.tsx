'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import type { SignUpNavigateOptions } from '../hooks/use-sign-up-form';

import { BLOG_PROFILE_URL_MAX_LENGTH } from '@/domains/blog/model/blog';
import { mapOnboardingRequest } from '@/features/sign-up/lib/map-onboarding-request';
import { clearSignUpFlow } from '@/features/sign-up/lib/sign-up-flow-session';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { useCheckNicknameAvailabilityMutation } from '@/shared/api/availability/mutations/use-check-nickname-availability-mutation';
import { useCheckSlugAvailabilityMutation } from '@/shared/api/availability/mutations/use-check-slug-availability-mutation';
import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';
import { useOnboardingMutation } from '@/shared/api/users/mutations/use-onboarding-mutation';
import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';
import { useImagePreviewUrl } from '@/shared/hooks/use-image-preview-url';
import Button from '@/shared/ui/button/Button';
import Checkbox from '@/shared/ui/checkbox/Checkbox';
import Field from '@/shared/ui/field/Field';
import ImageEditButton from '@/shared/ui/image-edit-button/ImageEditButton';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageResetOverlay from '@/shared/ui/image-reset-overlay/ImageResetOverlay';
import Input from '@/shared/ui/input/Input';
import ProfileSocialFields from '@/shared/ui/profile/ProfileSocialFields';
import Textarea from '@/shared/ui/textarea/Textarea';

import { useSignUpForm } from '../hooks/use-sign-up-form';
import {
	type CompleteSignUp,
	SIGN_UP_DESCRIPTION_MAX_LENGTH,
	SIGN_UP_NICKNAME_MAX_LENGTH,
	SIGN_UP_NICKNAME_MIN_LENGTH,
	SIGN_UP_SLUG_MAX_LENGTH,
	SIGN_UP_SLUG_MIN_LENGTH,
	SIGN_UP_SLUG_PATTERN,
} from '../model/sign-up';

const TERMS_OF_SERVICE_URL =
	'https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568021b809fedd5650c5dd?source=copy_link';
const PRIVACY_POLICY_URL =
	'https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568068a244ead52491639b?source=copy_link';
interface SignUpFormProps {
	completeSignUp?: CompleteSignUp;
	navigate?: (href: string, options?: SignUpNavigateOptions) => void;
}

export default function SignUpForm({ completeSignUp, navigate }: SignUpFormProps) {
	const profileImageLabelId = useId();
	const profileImageDescriptionId = `${profileImageLabelId}-description`;
	const profileImageErrorId = `${profileImageLabelId}-file-error`;
	const termsAgreementId = useId();
	const termsAgreementLinksId = `${termsAgreementId}-links`;
	const nicknameInputRef = useRef<HTMLInputElement>(null);
	const slugInputRef = useRef<HTMLInputElement>(null);
	const [isNicknameAvailabilityRequired, setIsNicknameAvailabilityRequired] = useState(false);
	const [isSlugAvailabilityRequired, setIsSlugAvailabilityRequired] = useState(false);
	const [profileImageFileSizeError, setProfileImageFileSizeError] = useState<string | null>(null);

	const { mutateAsync: onboard } = useOnboardingMutation();
	const { mutateAsync: uploadFile } = useUploadFileMutation();
	const nicknameAvailability = useCheckNicknameAvailabilityMutation();
	const slugAvailability = useCheckSlugAvailabilityMutation();

	const handleCompleteSignUp: CompleteSignUp = async (value) => {
		let profileImageUrl = '';
		if (value.profileImageFile) {
			const uploadRes = await uploadFile({ file: value.profileImageFile, type: 'IMAGE' });
			profileImageUrl = uploadRes.objectKey;
		}

		const response = await onboard(mapOnboardingRequest(value, profileImageUrl));

		if (response.accessToken) {
			tokenManager.setToken(response.accessToken);
		}

		return { slug: value.slug };
	};

	const router = useRouter();

	const {
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
		handleImageChange,
		handleDescriptionChange,
		handleSocialLinkChange,
		handleTermsAgreementChange,
		handleRequiredTextChange,
		validateRequiredTextField,
		handleSubmit,
	} = useSignUpForm({
		completeSignUp: completeSignUp ?? handleCompleteSignUp,
		navigate: navigate ?? ((href) => router.replace(href)),
	});

	const previewUrl = useImagePreviewUrl(profileImageFile, '/images/profile-placeholder.svg');
	const handleProfileImageChange = (file: File | null) => {
		setProfileImageFileSizeError(null);
		handleImageChange(file);
	};
	const handleCancel = () => {
		clearSignUpFlow();
		window.history.back();
	};

	const nicknameAvailabilityMessage = nicknameAvailability.isSuccess
		? nicknameAvailability.data.message
		: nicknameAvailability.isError
			? getApiErrorMessage(nicknameAvailability.error, '닉네임 중복 확인에 실패했습니다.')
			: undefined;
	const slugAvailabilityMessage = slugAvailability.isSuccess
		? slugAvailability.data.message
		: slugAvailability.isError
			? getApiErrorMessage(slugAvailability.error, '고유 아이디 중복 확인에 실패했습니다.')
			: undefined;

	const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		nicknameAvailability.reset();
		setIsNicknameAvailabilityRequired(false);
		handleRequiredTextChange(event);
	};

	const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		slugAvailability.reset();
		setIsSlugAvailabilityRequired(false);
		handleRequiredTextChange(event);
	};

	const handleNicknameAvailabilityCheck = async () => {
		setIsNicknameAvailabilityRequired(false);
		const input = nicknameInputRef.current;
		if (!input || !validateRequiredTextField('nickname', input.value)) {
			input?.focus();
			return;
		}

		try {
			await nicknameAvailability.mutateAsync(input.value.trim());
		} catch {
			// 오류 메시지는 mutation 상태를 통해 입력 하단에 표시한다.
		}
	};

	const handleSlugAvailabilityCheck = async () => {
		setIsSlugAvailabilityRequired(false);
		const input = slugInputRef.current;
		if (!input || !validateRequiredTextField('slug', input.value)) {
			input?.focus();
			return;
		}

		try {
			await slugAvailability.mutateAsync(input.value.trim());
		} catch {
			// 오류 메시지는 mutation 상태를 통해 입력 하단에 표시한다.
		}
	};

	const handleSignUpSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
		if (nicknameAvailability.isSuccess && slugAvailability.isSuccess) {
			void handleSubmit(event);
			return;
		}

		event.preventDefault();
		const isNicknameValid = validateRequiredTextField('nickname', nicknameInputRef.current?.value ?? '');
		const isSlugValid = validateRequiredTextField('slug', slugInputRef.current?.value ?? '');

		setIsNicknameAvailabilityRequired(!nicknameAvailability.isSuccess && isNicknameValid);
		setIsSlugAvailabilityRequired(!slugAvailability.isSuccess && isSlugValid);

		if (!nicknameAvailability.isSuccess) {
			nicknameInputRef.current?.focus();
			return;
		}

		slugInputRef.current?.focus();
	};

	return (
		<form noValidate className="mt-8 flex flex-col gap-8 pb-24" onSubmit={handleSignUpSubmit}>
			<div
				role="group"
				aria-labelledby={profileImageLabelId}
				aria-describedby={profileImageDescriptionId}
				className="flex flex-col gap-3"
			>
				<p id={profileImageLabelId} className="text-body-2 font-semibold text-text-primary">
					프로필 이미지 (선택)
				</p>
				<ul id={profileImageDescriptionId} className="list-disc pl-5 text-label-2 text-text-secondary">
					<li>프로필 이미지는 360*360px(1:1) 사이즈를 권장해요.</li>
					<li>10MB 이하의 파일만 업로드 가능해요.</li>
				</ul>
				<div className="flex flex-col gap-2">
					<div className="flex items-end gap-4">
						<div className="group relative shrink-0">
							<ImagePreview
								src={previewUrl}
								alt="프로필 이미지 미리보기"
								shape="circle"
								status={profileImageFileSizeError ? 'error' : 'default'}
								fit={profileImageFile === null ? 'contain' : 'cover'}
								sizes="100px"
								className="size-25 bg-background"
								imageClassName={previewUrl.startsWith('blob:') ? undefined : 'px-5 py-4'}
							/>
							{profileImageFile !== null && (
								<ImageResetOverlay
									imageLabel="프로필 이미지"
									disabled={isSigningUp}
									onReset={() => handleProfileImageChange(null)}
								/>
							)}
						</div>
						<ImageEditButton
							imageLabel="프로필 이미지"
							hasImage={profileImageFile !== null}
							disabled={isSigningUp}
							aria-describedby={
								profileImageFileSizeError
									? `${profileImageDescriptionId} ${profileImageErrorId}`
									: profileImageDescriptionId
							}
							aria-invalid={profileImageFileSizeError !== null}
							validateFile={(file) => file.size <= MAX_IMAGE_FILE_SIZE_BYTES}
							onFileRejected={(file) => {
								if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
									setProfileImageFileSizeError('프로필 이미지는 10MB 이하의 이미지만 업로드할 수 있어요.');
								}
							}}
							onFileChange={handleProfileImageChange}
						/>
					</div>
					{profileImageFileSizeError && (
						<p id={profileImageErrorId} role="alert" className="text-label-1 text-danger">
							{profileImageFileSizeError}
						</p>
					)}
				</div>
			</div>

			<Field label="닉네임" description="닉네임은 2~20자 사이로 입력 가능해요." required>
				{({ id, describedBy }) => (
					<div className="flex items-start gap-2">
						<Input
							ref={nicknameInputRef}
							id={id}
							aria-describedby={describedBy}
							name="nickname"
							minLength={SIGN_UP_NICKNAME_MIN_LENGTH}
							maxLength={SIGN_UP_NICKNAME_MAX_LENGTH}
							required
							placeholder="예: 리로그"
							autoComplete="nickname"
							disabled={isSigningUp || nicknameAvailability.isPending}
							onChange={handleNicknameChange}
							status={
								validationErrors.nickname !== undefined ||
								nicknameAvailability.isError ||
								isNicknameAvailabilityRequired
									? 'error'
									: nicknameAvailability.isSuccess
										? 'success'
										: 'default'
							}
							helperText={
								validationErrors.nickname ??
								(isNicknameAvailabilityRequired ? '닉네임 중복 확인이 필요합니다.' : nicknameAvailabilityMessage)
							}
						/>
						<Button
							variant="secondary"
							className="shrink-0 bg-white whitespace-nowrap"
							aria-label="닉네임 중복 확인"
							disabled={isSigningUp}
							isPending={nicknameAvailability.isPending}
							onClick={() => void handleNicknameAvailabilityCheck()}
						>
							{nicknameAvailability.isPending ? '확인 중' : '중복 확인'}
						</Button>
					</div>
				)}
			</Field>

			<Field
				label="고유 아이디"
				description={
					<ul className="list-disc pl-5">
						<li>아이디는 4~20자 사이로 입력 가능해요.</li>
						<li>영어와 숫자, 허용된 특수기호(-/_)만 사용 가능해요.</li>
						<li>아이디는 한 번 설정하면 변경할 수 없습니다.</li>
					</ul>
				}
				required
			>
				{({ id, describedBy }) => (
					<div className="flex items-start gap-2">
						<Input
							ref={slugInputRef}
							id={id}
							aria-describedby={describedBy}
							name="slug"
							minLength={SIGN_UP_SLUG_MIN_LENGTH}
							maxLength={SIGN_UP_SLUG_MAX_LENGTH}
							pattern={SIGN_UP_SLUG_PATTERN}
							required
							disabled={isSigningUp || slugAvailability.isPending}
							onChange={handleSlugChange}
							status={
								validationErrors.slug !== undefined || slugAvailability.isError || isSlugAvailabilityRequired
									? 'error'
									: slugAvailability.isSuccess
										? 'success'
										: 'default'
							}
							helperText={
								validationErrors.slug ??
								(isSlugAvailabilityRequired ? '고유 아이디 중복 확인이 필요합니다.' : slugAvailabilityMessage)
							}
							left={
								<span aria-hidden="true" className="whitespace-nowrap text-text-secondary">
									rilog.kr/@
								</span>
							}
						/>
						<Button
							variant="secondary"
							className="shrink-0 bg-white whitespace-nowrap"
							aria-label="고유 아이디 중복 확인"
							disabled={isSigningUp}
							isPending={slugAvailability.isPending}
							onClick={() => void handleSlugAvailabilityCheck()}
						>
							{slugAvailability.isPending ? '확인 중' : '중복 확인'}
						</Button>
					</div>
				)}
			</Field>

			<Field label="한 줄 소개" description="나를 소개하는 문장을 입력하세요.">
				{({ id, describedBy }) => (
					<Textarea
						id={id}
						aria-describedby={describedBy}
						name="description"
						value={description}
						maxLength={SIGN_UP_DESCRIPTION_MAX_LENGTH}
						onChange={handleDescriptionChange}
						disabled={isSigningUp}
					/>
				)}
			</Field>

			<ProfileSocialFields
				serviceUrl={serviceUrl}
				githubUrl={githubUrl}
				maxLength={BLOG_PROFILE_URL_MAX_LENGTH}
				errors={validationErrors}
				serviceUrlRef={serviceUrlRef}
				githubUrlRef={githubUrlRef}
				description="링크를 통해 나를 표현해 보세요."
				disabled={isSigningUp}
				onChange={handleSocialLinkChange}
			/>

			<label className="flex items-center gap-2 text-body-2 text-text-primary">
				<Checkbox
					id={termsAgreementId}
					name="termsAgreement"
					value="accepted"
					aria-label="[필수] 아래 약관에 동의합니다."
					aria-describedby={termsAgreementLinksId}
					required
					checked={isTermsAgreed}
					disabled={isSigningUp}
					onChange={handleTermsAgreementChange}
				/>
				<span id={termsAgreementLinksId} className="sr-only">
					이용약관 및 개인정보처리방침
				</span>
				<div className="flex items-center gap-2 text-text-secondary">
					<a
						href={TERMS_OF_SERVICE_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="font-semibold underline underline-offset-2 focus-visible:rounded-sm focus-visible:outline-focus-ring"
					>
						이용약관
					</a>
					<span aria-hidden="true">및</span>
					<a
						href={PRIVACY_POLICY_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="font-semibold underline underline-offset-2 focus-visible:rounded-sm focus-visible:outline-focus-ring"
					>
						개인정보처리방침
					</a>
					<span>에 동의합니다.</span>
				</div>
			</label>

			{signUpState.status === 'error' && (
				<p className="rounded-md border border-danger bg-background p-3 text-label-2 text-danger" role="alert">
					{signUpState.message}
				</p>
			)}

			<div className="flex flex-col-reverse justify-end gap-4 sm:flex-row">
				<Button
					variant="secondary"
					size="lg"
					className="w-full bg-white sm:w-40"
					disabled={isSigningUp}
					onClick={handleCancel}
				>
					취소
				</Button>
				<Button type="submit" size="lg" className="w-full sm:w-40" disabled={!isTermsAgreed} isPending={isSigningUp}>
					{isSigningUp ? '시작하는 중' : '시작하기'}
				</Button>
			</div>
		</form>
	);
}
