import { useId } from 'react';

import type {
	CologProfileFormValue,
	CologProfileTextField,
	CologProfileValidationErrors,
} from '../model/colog-profile-form';
import type { RefObject } from 'react';

import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

import {
	COLOG_PROFILE_INTRODUCTION_MAX_LENGTH,
	COLOG_PROFILE_NAME_MAX_LENGTH,
	COLOG_PROFILE_NAME_MIN_LENGTH,
	COLOG_PROFILE_SLUG_MAX_LENGTH,
	COLOG_PROFILE_SLUG_MIN_LENGTH,
	COLOG_PROFILE_SLUG_PATTERN,
} from '../model/colog-profile-form';

import CologProfileImageFields from './CologProfileImageFields';
import CologProfileSocialFields from './CologProfileSocialFields';

interface CologProfileFieldRefs {
	logoFile: RefObject<HTMLInputElement | null>;
	name: RefObject<HTMLInputElement | null>;
	slug: RefObject<HTMLInputElement | null>;
	introduction: RefObject<HTMLTextAreaElement | null>;
	serviceUrl: RefObject<HTMLInputElement | null>;
	githubUrl: RefObject<HTMLInputElement | null>;
	email: RefObject<HTMLInputElement | null>;
}

interface CologProfileFormFieldsProps {
	value: CologProfileFormValue;
	errors: CologProfileValidationErrors;
	refs: CologProfileFieldRefs;
	disabled?: boolean;
	onTextFieldChange: (field: CologProfileTextField, value: string) => void;
	onLogoFileChange: (file: File | null) => void;
	onCoverImageFileChange: (file: File | null) => void;
}

export default function CologProfileFormFields({
	value,
	errors,
	refs,
	disabled = false,
	onTextFieldChange,
	onLogoFileChange,
	onCoverImageFileChange,
}: CologProfileFormFieldsProps) {
	const introductionErrorId = useId();

	return (
		<>
			<CologProfileImageFields
				logoImageUrl={value.logoImageUrl}
				logoFile={value.logoFile}
				coverImageUrl={value.coverImageUrl}
				coverImageFile={value.coverImageFile}
				logoError={errors.logoFile}
				logoInputRef={refs.logoFile}
				disabled={disabled}
				onLogoFileChange={onLogoFileChange}
				onCoverImageFileChange={onCoverImageFileChange}
			/>

			<Field label="팀 이름" description="팀 이름은 2~20자 사이로 입력 가능해요.">
				{({ id, describedBy }) => (
					<Input
						ref={refs.name}
						id={id}
						aria-describedby={describedBy}
						name="name"
						value={value.name}
						minLength={COLOG_PROFILE_NAME_MIN_LENGTH}
						maxLength={COLOG_PROFILE_NAME_MAX_LENGTH}
						placeholder="예: 리로그"
						autoComplete="organization"
						disabled={disabled}
						status={errors.name === undefined ? 'default' : 'error'}
						helperText={errors.name}
						onChange={(event) => onTextFieldChange('name', event.currentTarget.value)}
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
						ref={refs.slug}
						id={id}
						aria-describedby={describedBy}
						name="slug"
						value={value.slug}
						minLength={COLOG_PROFILE_SLUG_MIN_LENGTH}
						maxLength={COLOG_PROFILE_SLUG_MAX_LENGTH}
						pattern={COLOG_PROFILE_SLUG_PATTERN}
						placeholder="team-name"
						autoCapitalize="none"
						autoComplete="off"
						spellCheck={false}
						disabled={disabled}
						status={errors.slug === undefined ? 'default' : 'error'}
						helperText={errors.slug}
						left={
							<span aria-hidden="true" className="-mr-1.5 whitespace-nowrap text-text-secondary">
								rilog.kr/@
							</span>
						}
						onChange={(event) => onTextFieldChange('slug', event.currentTarget.value)}
						required
					/>
				)}
			</Field>

			<Field label="팀 소개 (선택)" description="팀을 소개해 보세요.">
				{({ id, describedBy }) => (
					<div>
						<Textarea
							ref={refs.introduction}
							id={id}
							aria-describedby={
								errors.introduction === undefined ? describedBy : `${describedBy} ${introductionErrorId}`
							}
							name="introduction"
							value={value.introduction}
							maxLength={COLOG_PROFILE_INTRODUCTION_MAX_LENGTH}
							size="lg"
							disabled={disabled}
							status={errors.introduction === undefined ? 'default' : 'error'}
							onChange={(event) => onTextFieldChange('introduction', event.currentTarget.value)}
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
				value={value}
				errors={errors}
				serviceUrlRef={refs.serviceUrl}
				githubUrlRef={refs.githubUrl}
				emailRef={refs.email}
				disabled={disabled}
				onChange={onTextFieldChange}
			/>
		</>
	);
}
