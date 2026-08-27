'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { SubmitEvent } from 'react';

import { getAnalyticsErrorProperties } from '@/features/analytics/lib/get-analytics-error-properties';
import { consumeCologCreationEntryContext } from '@/features/analytics/lib/colog-creation-entry-context';
import { analytics } from '@/features/analytics/model/events';
import { getApiErrorMessage, isErrorDetail, normalizeApiError } from '@/shared/api/api-error';
import { useCheckNicknameAvailabilityMutation } from '@/shared/api/availability/mutations/use-check-nickname-availability-mutation';
import { useCheckSlugAvailabilityMutation } from '@/shared/api/availability/mutations/use-check-slug-availability-mutation';
import { useCreateCologMutation } from '@/shared/api/cologs/mutations/use-create-colog-mutation';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';

import { useCologCreateForm } from '../hooks/use-colog-create-form';
import { INITIAL_COLOG_CREATE_VALUE } from '../model/colog-create';

import CologCreateFormFields from './CologCreateFormFields';

interface CologCreateFormProps {
	navigate?: (href: string) => void;
}

const COLOG_CREATE_INVALID_FIELD_ALLOWLIST = new Set([
	'name',
	'slug',
	'introduction',
	'profileImageUrl',
	'coverImageUrl',
	'serviceUrl',
	'githubUrl',
]);

const getApiErrorDetail = (error: unknown) => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'type' in error &&
		error.type === 'api' &&
		'detail' in error &&
		isErrorDetail(error.detail)
	) {
		return error.detail;
	}

	const normalizedError = normalizeApiError(error);

	return normalizedError.type === 'api' ? normalizedError.detail : null;
};

const getCologCreateInvalidFields = (error: unknown) => {
	const detail = getApiErrorDetail(error);

	if (detail?.invalidParams === null || detail === null) {
		return [];
	}

	return detail.invalidParams
		.map((param) => param.name)
		.filter((name): name is string => name !== null && COLOG_CREATE_INVALID_FIELD_ALLOWLIST.has(name));
};

const getCologCreateErrorCode = (error: unknown) => {
	const detail = getApiErrorDetail(error);

	return detail?.errorCode ?? getAnalyticsErrorProperties(error).errorCode;
};

export default function CologCreateForm({ navigate }: CologCreateFormProps) {
	const router = useRouter();
	const form = useCologCreateForm({ initialValue: INITIAL_COLOG_CREATE_VALUE });
	const [isNameAvailabilityRequired, setIsNameAvailabilityRequired] = useState(false);
	const [isSlugAvailabilityRequired, setIsSlugAvailabilityRequired] = useState(false);

	const { mutateAsync: createColog, isPending: isCreating, error, reset: clearCreateError } = useCreateCologMutation();
	const nameAvailability = useCheckNicknameAvailabilityMutation();
	const slugAvailability = useCheckSlugAvailabilityMutation();

	const handleNameAvailabilityCheck = async () => {
		setIsNameAvailabilityRequired(false);
		const normalizedName = form.validateName();
		if (normalizedName === null) {
			return;
		}

		form.setValue({ ...form.value, name: normalizedName });

		try {
			await nameAvailability.mutateAsync(normalizedName);
		} catch {
			// 오류 메시지는 mutation 상태를 통해 입력 하단에 표시한다.
		}
	};

	const handleSlugAvailabilityCheck = async () => {
		setIsSlugAvailabilityRequired(false);
		const normalizedSlug = form.validateSlug();
		if (normalizedSlug === null) {
			return;
		}

		form.setValue({ ...form.value, slug: normalizedSlug });

		try {
			await slugAvailability.mutateAsync(normalizedSlug);
		} catch {
			// 오류 메시지는 mutation 상태를 통해 입력 하단에 표시한다.
		}
	};

	const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isCreating) {
			return;
		}

		const normalizedValue = form.validate();

		if (normalizedValue === null) {
			return;
		}

		if (!nameAvailability.isSuccess) {
			setIsNameAvailabilityRequired(true);
			form.refs.name.current?.focus();
			return;
		}

		if (!slugAvailability.isSuccess) {
			setIsSlugAvailabilityRequired(true);
			form.refs.slug.current?.focus();
			return;
		}

		form.setValue(normalizedValue);

		try {
			analytics.cologCreationStarted({ entrySource: consumeCologCreationEntryContext() });
			const response = await createColog(normalizedValue);
			const data = response.data;

			if (!data) {
				throw new Error('팀을 만들지 못했습니다. 다시 시도해 주세요.');
			}

			const profilePath = buildBlogHomePath(data.slug);
			analytics.cologCreated({
				cologId: data.id,
				hasCoverImage: normalizedValue.coverImageFile !== null,
				hasIntroduction: (normalizedValue.description ?? '').trim() !== '',
				hasServiceUrl: (normalizedValue.serviceUrl ?? '').trim() !== '',
				hasGithubUrl: (normalizedValue.githubUrl ?? '').trim() !== '',
			});

			if (navigate !== undefined) {
				navigate(profilePath);
				return;
			}

			router.replace(profilePath);
		} catch (submitError) {
			analytics.cologCreationFailed({
				errorCode: getCologCreateErrorCode(submitError),
				invalidFields: getCologCreateInvalidFields(submitError),
			});
		}
	};

	const errorMessage = error?.message || '팀을 만들지 못했습니다. 입력한 내용은 유지되며 다시 시도할 수 있습니다.';
	const nameAvailabilityMessage = nameAvailability.isSuccess
		? nameAvailability.data.message
		: nameAvailability.isError
			? getApiErrorMessage(nameAvailability.error, '팀 이름 중복 확인에 실패했습니다.')
			: undefined;
	const slugAvailabilityMessage = slugAvailability.isSuccess
		? slugAvailability.data.message
		: slugAvailability.isError
			? getApiErrorMessage(slugAvailability.error, '고유 아이디 중복 확인에 실패했습니다.')
			: undefined;
	const displayedSlugAvailabilityStatus = isSlugAvailabilityRequired ? 'error' : slugAvailability.status;
	const displayedNameAvailabilityStatus = isNameAvailabilityRequired ? 'error' : nameAvailability.status;
	const displayedNameAvailabilityMessage = isNameAvailabilityRequired
		? '팀 이름 중복 확인이 필요합니다.'
		: nameAvailabilityMessage;
	const displayedSlugAvailabilityMessage = isSlugAvailabilityRequired
		? '팀 고유 아이디 중복 확인이 필요합니다.'
		: slugAvailabilityMessage;

	return (
		<form noValidate className="mt-8 flex flex-col gap-8 pb-24" onSubmit={(event) => void handleSubmit(event)}>
			<CologCreateFormFields
				value={form.value}
				errors={form.errors}
				refs={form.refs}
				disabled={isCreating}
				nameAvailabilityStatus={displayedNameAvailabilityStatus}
				nameAvailabilityMessage={displayedNameAvailabilityMessage}
				slugAvailabilityStatus={displayedSlugAvailabilityStatus}
				slugAvailabilityMessage={displayedSlugAvailabilityMessage}
				onTextFieldChange={(field, value) => {
					form.updateTextField(field, value);
					if (field === 'name') {
						nameAvailability.reset();
						setIsNameAvailabilityRequired(false);
					}
					if (field === 'slug') {
						slugAvailability.reset();
						setIsSlugAvailabilityRequired(false);
					}
					clearCreateError();
				}}
				onNameAvailabilityCheck={() => void handleNameAvailabilityCheck()}
				onSlugAvailabilityCheck={() => void handleSlugAvailabilityCheck()}
				onLogoFileChange={(file) => {
					form.updateLogoFile(file);
					clearCreateError();
				}}
				onCoverImageFileChange={(file) => {
					form.updateCoverImageFile(file);
					clearCreateError();
				}}
			/>

			{error !== null && (
				<p className="rounded-md border border-danger bg-background p-3 text-label-2 text-danger" role="alert">
					{errorMessage}
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
