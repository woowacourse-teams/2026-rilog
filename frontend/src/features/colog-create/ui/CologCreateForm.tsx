'use client';

import { useEffect, useId, useState } from 'react';

import type { ChangeEvent } from 'react';

import Button from '@/shared/ui/button/Button';
import ButtonLink from '@/shared/ui/button/ButtonLink';
import Field from '@/shared/ui/field/Field';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';
import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

const INTRODUCTION_MAX_LENGTH = 80;
const LOGO_PLACEHOLDER_URL = '/images/profile-placeholder.svg';
const COVER_PLACEHOLDER_URL = '/images/team-cover-placeholder.svg';

export default function CologCreateForm() {
	const logoLabelId = useId();
	const coverLabelId = useId();
	const socialLabelId = useId();
	const socialDescriptionId = `${socialLabelId}-description`;
	const [logoPreviewUrl, setLogoPreviewUrl] = useState(LOGO_PLACEHOLDER_URL);
	const [coverPreviewUrl, setCoverPreviewUrl] = useState(COVER_PLACEHOLDER_URL);
	const [introduction, setIntroduction] = useState('');

	useEffect(() => {
		return () => {
			if (logoPreviewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(logoPreviewUrl);
			}
		};
	}, [logoPreviewUrl]);

	useEffect(() => {
		return () => {
			if (coverPreviewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(coverPreviewUrl);
			}
		};
	}, [coverPreviewUrl]);

	function handleLogoChange(file: File | null) {
		setLogoPreviewUrl(file ? URL.createObjectURL(file) : LOGO_PLACEHOLDER_URL);
	}

	function handleCoverChange(file: File | null) {
		setCoverPreviewUrl(file ? URL.createObjectURL(file) : COVER_PLACEHOLDER_URL);
	}

	function handleIntroductionChange(event: ChangeEvent<HTMLTextAreaElement>) {
		setIntroduction(event.currentTarget.value);
	}

	return (
		<form className="mt-8 flex flex-col gap-8 pb-24">
			<div role="group" aria-labelledby={logoLabelId} className="flex max-w-[286px] flex-col gap-3">
				<p id={logoLabelId} className="text-body-2 font-semibold text-text-primary">
					팀 로고
				</p>
				<div className="flex items-end gap-4">
					<ImagePreview
						src={logoPreviewUrl}
						alt="팀 로고 미리보기"
						fit={logoPreviewUrl.startsWith('blob:') ? 'cover' : 'contain'}
						sizes="100px"
						className="size-[100px] shrink-0"
						imageClassName={logoPreviewUrl.startsWith('blob:') ? undefined : 'px-5 py-4'}
					/>
					<div className="flex-1">
						<ImageUploader
							name="logoFile"
							buttonLabel="팀 로고 변경"
							onFileChange={handleLogoChange}
							className="bg-white"
							required
						/>
					</div>
				</div>
			</div>

			<div role="group" aria-labelledby={coverLabelId} className="flex flex-col gap-3">
				<p id={coverLabelId} className="text-body-2 font-semibold text-text-primary">
					커버 이미지 (선택)
				</p>
				<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
					<ImagePreview
						src={coverPreviewUrl}
						alt="팀 커버 이미지 미리보기"
						shape="rectangle"
						fit="cover"
						sizes="(max-width: 640px) 100vw, 418px"
						className="0 w-full max-w-[418px]"
					/>
					<div className="w-full sm:w-auto">
						<ImageUploader
							name="coverImageFile"
							buttonLabel="커버 이미지 변경"
							onFileChange={handleCoverChange}
							fullWidth
							className="bg-white sm:w-44"
						/>
					</div>
				</div>
			</div>

			<Field label="팀 이름" description="팀 이름은 2~20자 사이로 입력 가능해요.">
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						name="name"
						minLength={2}
						maxLength={20}
						placeholder="예: 리로그"
						autoComplete="organization"
						required
					/>
				)}
			</Field>

			<Field
				label="팀 고유 아이디"
				description={
					<ul className="list-disc pl-5">
						<li>아이디는 4~20자 사이로 입력 가능해요.</li>
						<li>영문 소문자와 숫자, 하이픈(-)만 사용할 수 있어요.</li>
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
						pattern="[a-z0-9-]+"
						placeholder="team-name"
						autoCapitalize="none"
						autoComplete="off"
						spellCheck={false}
						left={
							<span aria-hidden="true" className="whitespace-nowrap text-text-secondary">
								rilog.kr/co-logs/@
							</span>
						}
						required
					/>
				)}
			</Field>

			<Field label="팀 소개" description="팀을 소개해 보세요.">
				{({ id, describedBy }) => (
					<Textarea
						id={id}
						aria-describedby={describedBy}
						name="introduction"
						value={introduction}
						maxLength={INTRODUCTION_MAX_LENGTH}
						onChange={handleIntroductionChange}
						required
					/>
				)}
			</Field>

			<div
				role="group"
				aria-labelledby={socialLabelId}
				aria-describedby={socialDescriptionId}
				className="flex flex-col gap-3"
			>
				<div className="flex flex-col gap-1">
					<p id={socialLabelId} className="text-body-2 font-semibold text-text-primary">
						소셜 (선택)
					</p>
					<p id={socialDescriptionId} className="text-label-2 text-text-secondary">
						링크를 통해 팀을 표현해 보세요.
					</p>
				</div>
				<div className="flex flex-col gap-4">
					<Input
						id="serviceUrl"
						aria-label="서비스 링크"
						aria-describedby={socialDescriptionId}
						name="serviceUrl"
						type="url"
						maxLength={512}
						placeholder="https://"
						autoComplete="url"
						left={<div aria-hidden="true" className="size-[18px] shrink-0 rounded-sm border-2 border-text-secondary" />}
					/>
					<Input
						id="githubUrl"
						aria-label="GitHub 링크"
						aria-describedby={socialDescriptionId}
						name="githubUrl"
						type="url"
						maxLength={512}
						placeholder="https://"
						autoComplete="url"
						left={<div aria-hidden="true" className="size-[18px] shrink-0 rounded-sm bg-github" />}
					/>
					<Input
						id="email"
						aria-label="이메일"
						aria-describedby={socialDescriptionId}
						name="email"
						type="email"
						maxLength={512}
						placeholder="rilog@kr"
						autoComplete="email"
						left={<div aria-hidden="true" className="size-[18px] shrink-0 rounded-sm border border-text-secondary" />}
					/>
				</div>
			</div>

			<div className="flex flex-col-reverse justify-end gap-4 sm:flex-row">
				<ButtonLink href="/feeds" variant="secondary" size="lg" className="w-full bg-white sm:w-40">
					취소
				</ButtonLink>
				<Button type="submit" size="lg" className="w-full sm:w-40">
					팀 만들기
				</Button>
			</div>
		</form>
	);
}
