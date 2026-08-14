'use client';

import { useEffect, useId, useState } from 'react';

import type { ChangeEvent } from 'react';

import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';
import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

const INTRODUCTION_MAX_LENGTH = 80;

export default function SignUpForm() {
	const profileImageLabelId = useId();
	const [previewUrl, setPreviewUrl] = useState('/images/profile-placeholder.svg');
	const [introduction, setIntroduction] = useState('');

	useEffect(() => {
		return () => {
			if (previewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	function handleImageChange(file: File | null) {
		setPreviewUrl(file ? URL.createObjectURL(file) : '/images/profile-placeholder.svg');
	}

	function handleIntroductionChange(event: ChangeEvent<HTMLTextAreaElement>) {
		setIntroduction(event.currentTarget.value);
	}

	return (
		<form className="mt-8 flex flex-col gap-8 pb-24">
			<div role="group" aria-labelledby={profileImageLabelId} className="flex flex-col gap-3">
				<p id={profileImageLabelId} className="text-body-2 font-semibold text-text-primary">
					프로필 이미지 (선택)
				</p>
				<div className="flex items-end gap-4">
					<ImagePreview
						src={previewUrl}
						alt="프로필 이미지 미리보기"
						shape="circle"
						fit={previewUrl.startsWith('blob:') ? 'cover' : 'contain'}
						sizes="100px"
						className="size-[100px] shrink-0 bg-background"
						imageClassName={previewUrl.startsWith('blob:') ? undefined : 'px-5 py-4'}
					/>
					<div className="flex-1">
						<ImageUploader onFileChange={handleImageChange} className="bg-white" />
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
						placeholder="예: 리로그"
						autoComplete="nickname"
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
					/>
				)}
			</Field>

			<div className="flex justify-end gap-4">
				<Button variant="secondary" size="lg" className="w-40 bg-white">
					취소
				</Button>
				<Button size="lg" className="w-40">
					시작하기
				</Button>
			</div>
		</form>
	);
}
