'use client';

import { useId, useState } from 'react';

import type { CompleteSignUp } from '../model/sign-up';
import type { ChangeEvent, SubmitEvent } from 'react';

import { useImagePreviewUrl } from '@/shared/hooks/use-image-preview-url';
import Button from '@/shared/ui/button/Button';
import Checkbox from '@/shared/ui/checkbox/Checkbox';
import Field from '@/shared/ui/field/Field';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';
import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

import { mockCompleteSignUp } from '../lib/mock-complete-sign-up';

const INTRODUCTION_MAX_LENGTH = 80;
const TERMS_OF_SERVICE_URL = 'https://example.com/terms-of-service';
const PRIVACY_POLICY_URL = 'https://example.com/privacy-policy';

const getFormDataText = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '');

type SignUpState = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

interface SignUpFormProps {
	completeSignUp?: CompleteSignUp;
	navigate?: (href: string) => void;
}

export default function SignUpForm({ completeSignUp = mockCompleteSignUp, navigate }: SignUpFormProps) {
	const profileImageLabelId = useId();
	const termsAgreementId = useId();
	const termsAgreementLinksId = `${termsAgreementId}-links`;
	const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
	const [introduction, setIntroduction] = useState('');
	const [signUpState, setSignUpState] = useState<SignUpState>({ status: 'idle' });
	const previewUrl = useImagePreviewUrl(profileImageFile, '/images/profile-placeholder.svg');
	const isSigningUp = signUpState.status === 'pending';

	const clearSignUpError = () => {
		setSignUpState((currentState) => (currentState.status === 'error' ? { status: 'idle' } : currentState));
	};

	function handleImageChange(file: File | null) {
		setProfileImageFile(file);
		clearSignUpError();
	}

	function handleIntroductionChange(event: ChangeEvent<HTMLTextAreaElement>) {
		setIntroduction(event.currentTarget.value);
		clearSignUpError();
	}

	const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isSigningUp) {
			return;
		}

		if (!event.currentTarget.checkValidity()) {
			event.currentTarget.reportValidity();
			return;
		}

		const formData = new FormData(event.currentTarget);
		const nickname = getFormDataText(formData.get('nickname')).trim();
		const slug = getFormDataText(formData.get('slug')).trim();

		setSignUpState({ status: 'pending' });

		try {
			await completeSignUp({ nickname, slug, introduction: introduction.trim(), profileImageFile });

			if (navigate !== undefined) {
				navigate('/');
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
					<div className="flex-1">
						<ImageUploader onFileChange={handleImageChange} disabled={isSigningUp} className="bg-white" />
					</div>
				</div>
			</div>

			<Field label="닉네임" description="닉네임은 2~20자 사이로 입력 가능해요.">
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						name="nickname"
						minLength={2}
						maxLength={20}
						required
						placeholder="예: 리로그"
						autoComplete="nickname"
						disabled={isSigningUp}
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
						minLength={4}
						maxLength={20}
						pattern="[A-Za-z0-9_-]+"
						required
						disabled={isSigningUp}
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
						name="introduction"
						value={introduction}
						maxLength={INTRODUCTION_MAX_LENGTH}
						onChange={handleIntroductionChange}
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
