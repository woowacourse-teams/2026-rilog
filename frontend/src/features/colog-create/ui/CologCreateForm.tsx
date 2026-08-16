'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import type { CologCreateValidationErrors, CreateColog } from '../model/colog-create';
import type { SubmitEvent } from 'react';

import {
	COLOG_PROFILE_INTRODUCTION_MAX_LENGTH,
	COLOG_PROFILE_NAME_MAX_LENGTH,
	COLOG_PROFILE_NAME_MIN_LENGTH,
	COLOG_PROFILE_SLUG_MAX_LENGTH,
	COLOG_PROFILE_SLUG_MIN_LENGTH,
	COLOG_PROFILE_SLUG_PATTERN,
} from '@/domains/colog/model/colog-profile-form';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

import { mockCreateColog } from '../lib/mock-create-colog';
import { INITIAL_COLOG_CREATE_VALUE, normalizeCologCreateValue, validateCologCreateValue } from '../model/colog-create';

import CologCreateImageFields from './CologCreateImageFields';
import CologCreateSocialFields from './CologCreateSocialFields';

interface CologCreateFormProps {
	createColog?: CreateColog;
	navigate?: (href: string) => void;
}

type CologCreateTextField = Exclude<keyof CologCreateValidationErrors, 'logoFile'>;
type CreateState = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

const getCologProfilePath = (slug: string) => `/co-logs/@${slug}`;

export default function CologCreateForm({ createColog = mockCreateColog, navigate }: CologCreateFormProps) {
	const router = useRouter();
	const introductionErrorId = useId();
	const logoInputRef = useRef<HTMLInputElement>(null);
	const nameRef = useRef<HTMLInputElement>(null);
	const slugRef = useRef<HTMLInputElement>(null);
	const introductionRef = useRef<HTMLTextAreaElement>(null);
	const serviceUrlRef = useRef<HTMLInputElement>(null);
	const githubUrlRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);

	const [draft, setDraft] = useState(() => ({ ...INITIAL_COLOG_CREATE_VALUE }));
	const [errors, setErrors] = useState<CologCreateValidationErrors>({});
	const [createState, setCreateState] = useState<CreateState>({ status: 'idle' });
	const isCreating = createState.status === 'pending';

	const updateTextField = (field: CologCreateTextField, fieldValue: string) => {
		setDraft((currentDraft) => ({ ...currentDraft, [field]: fieldValue }));
		setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
		setCreateState({ status: 'idle' });
	};

	const focusFirstError = (nextErrors: CologCreateValidationErrors) => {
		const errorFocusOrder = [
			['logoFile', logoInputRef],
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

	const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isCreating) {
			return;
		}

		const normalizedDraft = normalizeCologCreateValue(draft);
		const nextErrors = validateCologCreateValue(normalizedDraft);

		setDraft(normalizedDraft);
		setErrors(nextErrors);

		if (Object.keys(nextErrors).length > 0) {
			setCreateState({ status: 'idle' });
			focusFirstError(nextErrors);
			return;
		}

		setCreateState({ status: 'pending' });

		try {
			const result = await createColog(normalizedDraft);
			const profilePath = getCologProfilePath(result.slug);

			if (navigate !== undefined) {
				navigate(profilePath);
				return;
			}

			router.replace(profilePath);
		} catch (error) {
			setCreateState({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: '팀을 만들지 못했습니다. 입력한 내용은 유지되며 다시 시도할 수 있습니다.',
			});
		}
	};

	return (
		<form noValidate className="mt-8 flex flex-col gap-8 pb-24" onSubmit={(event) => void handleSubmit(event)}>
			<CologCreateImageFields
				logoImageUrl={draft.logoImageUrl}
				logoFile={draft.logoFile}
				coverImageUrl={draft.coverImageUrl}
				coverImageFile={draft.coverImageFile}
				logoError={errors.logoFile}
				logoInputRef={logoInputRef}
				disabled={isCreating}
				onLogoFileChange={(logoFile) => {
					setDraft((currentDraft) => ({ ...currentDraft, logoFile }));
					setErrors((currentErrors) => ({ ...currentErrors, logoFile: undefined }));
					setCreateState({ status: 'idle' });
				}}
				onCoverImageFileChange={(coverImageFile) => {
					setDraft((currentDraft) => ({ ...currentDraft, coverImageFile }));
					setCreateState({ status: 'idle' });
				}}
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
						disabled={isCreating}
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
						placeholder="team-name"
						autoCapitalize="none"
						autoComplete="off"
						spellCheck={false}
						disabled={isCreating}
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

			<Field label="팀 소개" description="팀을 소개해 보세요.">
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
							disabled={isCreating}
							status={errors.introduction === undefined ? 'default' : 'error'}
							onChange={(event) => updateTextField('introduction', event.currentTarget.value)}
							required
						/>
						{errors.introduction !== undefined && (
							<p id={introductionErrorId} className="mt-1 text-label-1 text-danger">
								{errors.introduction}
							</p>
						)}
					</div>
				)}
			</Field>

			<CologCreateSocialFields
				value={draft}
				errors={errors}
				serviceUrlRef={serviceUrlRef}
				githubUrlRef={githubUrlRef}
				emailRef={emailRef}
				disabled={isCreating}
				onChange={updateTextField}
			/>

			{createState.status === 'error' && (
				<p className="rounded-md border border-danger bg-background p-3 text-label-2 text-danger" role="alert">
					{createState.message}
				</p>
			)}

			<div className="flex flex-col-reverse justify-end gap-4 sm:flex-row">
				<Button
					variant="secondary"
					size="lg"
					className="w-full sm:w-40"
					disabled={isCreating}
					onClick={() => router.back()}
				>
					취소
				</Button>
				<Button type="submit" size="lg" className="w-full sm:w-40" isPending={isCreating}>
					{isCreating ? '팀 만드는 중' : '팀 만들기'}
				</Button>
			</div>
		</form>
	);
}
