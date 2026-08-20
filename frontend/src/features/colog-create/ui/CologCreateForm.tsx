'use client';

import { useRouter } from 'next/navigation';

import type { SubmitEvent } from 'react';

import { getApiErrorMessage } from '@/shared/api/api-error';
import { useCheckSlugAvailabilityMutation } from '@/shared/api/availability/mutations/use-check-slug-availability-mutation';
import { useCreateCologMutation } from '@/shared/api/cologs/mutations/use-create-colog-mutation';
import { buildCologHomePath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';

import { useCologCreateForm } from '../hooks/use-colog-create-form';
import { INITIAL_COLOG_CREATE_VALUE } from '../model/colog-create';

import CologCreateFormFields from './CologCreateFormFields';

interface CologCreateFormProps {
	navigate?: (href: string) => void;
}

export default function CologCreateForm({ navigate }: CologCreateFormProps) {
	const router = useRouter();
	const form = useCologCreateForm({ initialValue: INITIAL_COLOG_CREATE_VALUE });

	const { mutateAsync: createColog, isPending: isCreating, error, reset: clearCreateError } = useCreateCologMutation();
	const slugAvailability = useCheckSlugAvailabilityMutation();

	const handleSlugAvailabilityCheck = async () => {
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

		form.setValue(normalizedValue);

		try {
			const response = await createColog(normalizedValue);
			const data = response.data;

			if (!data) {
				throw new Error('팀을 만들지 못했습니다. 다시 시도해 주세요.');
			}

			const profilePath = buildCologHomePath(data.slug);

			if (navigate !== undefined) {
				navigate(profilePath);
				return;
			}

			router.replace(profilePath);
		} catch {
			// useMutation internally catches and exposes the error via the `error` state.
		}
	};

	const errorMessage = error?.message || '팀을 만들지 못했습니다. 입력한 내용은 유지되며 다시 시도할 수 있습니다.';
	const slugAvailabilityMessage = slugAvailability.isSuccess
		? slugAvailability.data.message
		: slugAvailability.isError
			? getApiErrorMessage(slugAvailability.error, '고유 아이디 중복 확인에 실패했습니다.')
			: undefined;

	return (
		<form noValidate className="mt-8 flex flex-col gap-8 pb-24" onSubmit={(event) => void handleSubmit(event)}>
			<CologCreateFormFields
				value={form.value}
				errors={form.errors}
				refs={form.refs}
				disabled={isCreating}
				slugAvailabilityStatus={slugAvailability.status}
				slugAvailabilityMessage={slugAvailabilityMessage}
				onTextFieldChange={(field, value) => {
					form.updateTextField(field, value);
					if (field === 'slug') {
						slugAvailability.reset();
					}
					clearCreateError();
				}}
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
