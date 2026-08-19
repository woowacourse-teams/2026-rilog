'use client';

import { useRouter } from 'next/navigation';
import { useId } from 'react';

import type { SignUpNavigateOptions } from '../hooks/use-sign-up-form';

import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';
import { useOnboardingMutation } from '@/shared/api/users/mutations/use-onboarding-mutation';
import { useImagePreviewUrl } from '@/shared/hooks/use-image-preview-url';
import Button from '@/shared/ui/button/Button';
import Checkbox from '@/shared/ui/checkbox/Checkbox';
import Field from '@/shared/ui/field/Field';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';
import Input from '@/shared/ui/input/Input';
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

const TERMS_OF_SERVICE_URL = 'https://example.com/terms-of-service';
const PRIVACY_POLICY_URL = 'https://example.com/privacy-policy';

interface SignUpFormProps {
	completeSignUp?: CompleteSignUp;
	navigate?: (href: string, options?: SignUpNavigateOptions) => void;
}

export default function SignUpForm({ completeSignUp, navigate }: SignUpFormProps) {
	const profileImageLabelId = useId();
	const termsAgreementId = useId();
	const termsAgreementLinksId = `${termsAgreementId}-links`;

	const { mutateAsync: onboard } = useOnboardingMutation();
	const { mutateAsync: uploadFile } = useUploadFileMutation();

	const handleCompleteSignUp: CompleteSignUp = async (value) => {
		let profileImageUrl = '';
		if (value.profileImageFile) {
			const uploadRes = await uploadFile({ file: value.profileImageFile, type: 'IMAGE' });
			profileImageUrl = uploadRes.objectKey;
		}

		await onboard({
			nickname: value.nickname,
			slug: value.slug,
			introduction: value.description,
			profileImageUrl,
			githubUrl: '',
			email: '',
		});

		return { slug: value.slug };
	};

	const router = useRouter();

	const {
		profileImageFile,
		description,
		signUpState,
		isSigningUp,
		clearSignUpError,
		handleImageChange,
		handleDescriptionChange,
		handleRequiredTextChange,
		handleSubmit,
	} = useSignUpForm({
		completeSignUp: completeSignUp ?? handleCompleteSignUp,
		navigate: navigate ?? ((href) => router.replace(href)),
	});

	const previewUrl = useImagePreviewUrl(profileImageFile, '/images/profile-placeholder.svg');

	return (
		<form noValidate className="mt-8 flex flex-col gap-8 pb-24" onSubmit={(event) => void handleSubmit(event)}>
			<div role="group" aria-labelledby={profileImageLabelId} className="flex flex-col gap-3">
				<p id={profileImageLabelId} className="text-body-2 font-semibold text-text-primary">
					프로필 이미지 (선택)
				</p>
				<div className="flex items-end gap-4">
					<ImagePreview
						src={previewUrl}
						alt="프로필 이미지 미리보기"
						shape="circle"
						fit={profileImageFile === null ? 'contain' : 'cover'}
						sizes="100px"
						className="size-25 shrink-0 bg-background"
						imageClassName={previewUrl.startsWith('blob:') ? undefined : 'px-5 py-4'}
					/>
					<div className="flex flex-1 flex-wrap items-center gap-2">
						<ImageUploader onFileChange={handleImageChange} disabled={isSigningUp} className="bg-white" />
						{profileImageFile !== null && (
							<Button
								type="button"
								variant="secondary"
								size="md"
								disabled={isSigningUp}
								onClick={() => handleImageChange(null)}
							>
								기본 이미지로 변경
							</Button>
						)}
					</div>
				</div>
			</div>

			<Field label="닉네임" description="닉네임은 2~20자 사이로 입력 가능해요.">
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						name="nickname"
						minLength={SIGN_UP_NICKNAME_MIN_LENGTH}
						maxLength={SIGN_UP_NICKNAME_MAX_LENGTH}
						required
						placeholder="예: 리로그"
						autoComplete="nickname"
						disabled={isSigningUp}
						onChange={handleRequiredTextChange}
					/>
				)}
			</Field>

			<Field
				label="고유 아이디"
				description={
					<ul className="list-disc pl-5">
						<li>아이디는 4~20자 사이로 입력 가능해요.</li>
						<li>영어와 숫자, 허용된 특수기호(-/_)만 사용 가능해요.</li>
					</ul>
				}
			>
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						name="slug"
						minLength={SIGN_UP_SLUG_MIN_LENGTH}
						maxLength={SIGN_UP_SLUG_MAX_LENGTH}
						pattern={SIGN_UP_SLUG_PATTERN}
						required
						disabled={isSigningUp}
						onChange={handleRequiredTextChange}
						left={
							<span aria-hidden="true" className="whitespace-nowrap text-text-secondary">
								rilog.kr/@
							</span>
						}
					/>
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

			<label className="flex items-center gap-2 text-body-2 text-text-primary">
				<Checkbox
					id={termsAgreementId}
					name="termsAgreement"
					value="accepted"
					aria-label="[필수] 아래 약관에 동의합니다."
					aria-describedby={termsAgreementLinksId}
					required
					disabled={isSigningUp}
					onChange={clearSignUpError}
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
					onClick={() => window.history.back()}
				>
					취소
				</Button>
				<Button type="submit" size="lg" className="w-full sm:w-40" isPending={isSigningUp}>
					{isSigningUp ? '시작하는 중' : '시작하기'}
				</Button>
			</div>
		</form>
	);
}
