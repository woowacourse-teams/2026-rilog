'use client';

import { useEffect, useId, useRef, useState } from 'react';

import type { SubmitEvent } from 'react';

import { MOCK_COLOG_PROFILE_SETTINGS } from '@/features/colog-profile-management/lib/mock-colog-profile-settings';
import type { CologProfileValidationErrors } from '@/features/colog-profile-management/model/colog-profile-settings';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

import {
	areCologProfileSettingsEqual,
	COLOG_PROFILE_INTRODUCTION_MAX_LENGTH,
	COLOG_PROFILE_NAME_MAX_LENGTH,
	COLOG_PROFILE_NAME_MIN_LENGTH,
	COLOG_PROFILE_SLUG_MAX_LENGTH,
	COLOG_PROFILE_SLUG_MIN_LENGTH,
	COLOG_PROFILE_SLUG_PATTERN,
	normalizeCologProfileSettings,
	validateCologProfileSettings,
} from '../model/colog-profile-settings';

import CologProfileImageFields from './CologProfileImageFields';
import CologProfileSocialFields from './CologProfileSocialFields';

interface CologProfileSectionProps {
	onDirtyChange?: (isDirty: boolean) => void;
}

type CologProfileTextField = keyof CologProfileValidationErrors;

export default function CologProfileSection({ onDirtyChange }: CologProfileSectionProps) {
	const introductionErrorId = useId();
	const nameRef = useRef<HTMLInputElement>(null);
	const slugRef = useRef<HTMLInputElement>(null);
	const introductionRef = useRef<HTMLTextAreaElement>(null);
	const serviceUrlRef = useRef<HTMLInputElement>(null);
	const githubUrlRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);

	const [savedProfile, setSavedProfile] = useState(() => ({ ...MOCK_COLOG_PROFILE_SETTINGS }));
	const [draft, setDraft] = useState(() => ({ ...MOCK_COLOG_PROFILE_SETTINGS }));
	const [errors, setErrors] = useState<CologProfileValidationErrors>({});
	const isDirty = !areCologProfileSettingsEqual(draft, savedProfile);

	useEffect(() => {
		onDirtyChange?.(isDirty);
	}, [isDirty, onDirtyChange]);

	useEffect(
		() => () => {
			onDirtyChange?.(false);
		},
		[onDirtyChange],
	);

	const updateTextField = (field: CologProfileTextField, fieldValue: string) => {
		setDraft((currentDraft) => ({ ...currentDraft, [field]: fieldValue }));
		setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
	};

	const focusFirstError = (nextErrors: CologProfileValidationErrors) => {
		const errorFocusOrder = [
			['name', nameRef],
			['slug', slugRef],
			['introduction', introductionRef],
			['serviceUrl', serviceUrlRef],
			['githubUrl', githubUrlRef],
			['email', emailRef],
		] as const;
		const firstInvalidFieldRef = errorFocusOrder.find(([field]) => nextErrors[field] !== undefined)?.[1];

		firstInvalidFieldRef?.current?.focus();
	};

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const normalizedDraft = normalizeCologProfileSettings(draft);
		const nextErrors = validateCologProfileSettings(normalizedDraft);

		setDraft(normalizedDraft);
		setErrors(nextErrors);

		if (Object.keys(nextErrors).length > 0) {
			focusFirstError(nextErrors);
			return;
		}

		setSavedProfile(normalizedDraft);
	};

	return (
		<section aria-labelledby="profile-settings-title" className="flex h-full min-h-0 flex-col">
			<form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
				<div className="min-h-0 flex-1 overflow-y-auto px-0.5">
					<div className="-mx-0.5">
						<h1 id="profile-settings-title" className="text-heading-3 font-bold text-text-primary">
							프로필
						</h1>
						<p className="mt-0.5 text-body-1 text-text-secondary">팀의 기본 정보와 소개를 관리합니다.</p>
					</div>

					<div className="mt-12 flex flex-col gap-8">
						<CologProfileImageFields
							logoImageUrl={draft.logoImageUrl}
							logoFile={draft.logoFile}
							coverImageUrl={draft.coverImageUrl}
							coverImageFile={draft.coverImageFile}
							onLogoFileChange={(logoFile) => setDraft((currentDraft) => ({ ...currentDraft, logoFile }))}
							onCoverImageFileChange={(coverImageFile) =>
								setDraft((currentDraft) => ({ ...currentDraft, coverImageFile }))
							}
						/>

						<Field label="팀 이름" description="팀 이름은 2~20자 사이로 입력 가능해요.">
							{({ id, describedBy }) => (
								<Input
									ref={nameRef}
									id={id}
									aria-describedby={describedBy}
									name="name"
									value={draft.name}
									minLength={COLOG_PROFILE_NAME_MIN_LENGTH}
									maxLength={COLOG_PROFILE_NAME_MAX_LENGTH}
									placeholder="예: 리로그"
									autoComplete="organization"
									status={errors.name === undefined ? 'default' : 'error'}
									helperText={errors.name}
									onChange={(event) => updateTextField('name', event.currentTarget.value)}
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
									ref={slugRef}
									id={id}
									aria-describedby={describedBy}
									name="slug"
									value={draft.slug}
									minLength={COLOG_PROFILE_SLUG_MIN_LENGTH}
									maxLength={COLOG_PROFILE_SLUG_MAX_LENGTH}
									pattern={COLOG_PROFILE_SLUG_PATTERN}
									autoCapitalize="none"
									autoComplete="off"
									spellCheck={false}
									status={errors.slug === undefined ? 'default' : 'error'}
									helperText={errors.slug}
									left={
										<span aria-hidden="true" className="-mr-1.5 whitespace-nowrap text-text-secondary">
											rilog.kr/co-logs/@
										</span>
									}
									onChange={(event) => updateTextField('slug', event.currentTarget.value)}
									required
								/>
							)}
						</Field>

						<Field label="팀 소개" description="팀을 소개해 보세요. (선택)">
							{({ id, describedBy }) => (
								<div>
									<Textarea
										ref={introductionRef}
										id={id}
										aria-describedby={
											errors.introduction === undefined ? describedBy : `${describedBy} ${introductionErrorId}`
										}
										name="introduction"
										value={draft.introduction}
										maxLength={COLOG_PROFILE_INTRODUCTION_MAX_LENGTH}
										size="lg"
										status={errors.introduction === undefined ? 'default' : 'error'}
										onChange={(event) => updateTextField('introduction', event.currentTarget.value)}
									/>
									{errors.introduction !== undefined && (
										<p id={introductionErrorId} className="mt-1 text-label-1 text-danger">
											{errors.introduction}
										</p>
									)}
								</div>
							)}
						</Field>

						<CologProfileSocialFields
							value={draft}
							errors={errors}
							serviceUrlRef={serviceUrlRef}
							githubUrlRef={githubUrlRef}
							emailRef={emailRef}
							onChange={updateTextField}
						/>
					</div>
				</div>

				<div className="flex shrink-0 justify-end bg-background py-6">
					<Button type="submit" size="lg" className="w-full sm:w-48" disabled={!isDirty}>
						변경사항 저장
					</Button>
				</div>
			</form>
		</section>
	);
}
