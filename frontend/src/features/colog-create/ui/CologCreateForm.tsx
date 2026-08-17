'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { CreateColog } from '../model/colog-create';
import type { SubmitEvent } from 'react';

import { useCologProfileForm } from '@/domains/colog/hooks/use-colog-profile-form';
import CologProfileFormFields from '@/domains/colog/ui/CologProfileFormFields';
import Button from '@/shared/ui/button/Button';

import { mockCreateColog } from '../lib/mock-create-colog';
import { INITIAL_COLOG_CREATE_VALUE } from '../model/colog-create';

interface CologCreateFormProps {
	createColog?: CreateColog;
	navigate?: (href: string) => void;
}

type CreateState = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

const getCologProfilePath = (slug: string) => `/co-logs/@${slug}`;

export default function CologCreateForm({ createColog = mockCreateColog, navigate }: CologCreateFormProps) {
	const router = useRouter();
	const form = useCologProfileForm({ initialValue: INITIAL_COLOG_CREATE_VALUE });
	const [createState, setCreateState] = useState<CreateState>({ status: 'idle' });
	const isCreating = createState.status === 'pending';

	const clearCreateError = () => {
		setCreateState((currentState) => (currentState.status === 'error' ? { status: 'idle' } : currentState));
	};

	const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isCreating) {
			return;
		}

		const normalizedValue = form.validate();

		if (normalizedValue === null) {
			setCreateState({ status: 'idle' });
			return;
		}

		setCreateState({ status: 'pending' });

		try {
			const result = await createColog(normalizedValue);
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
			<CologProfileFormFields
				value={form.value}
				errors={form.errors}
				refs={form.refs}
				disabled={isCreating}
				onTextFieldChange={(field, value) => {
					form.updateTextField(field, value);
					clearCreateError();
				}}
				onLogoFileChange={(file) => {
					form.updateLogoFile(file);
					clearCreateError();
				}}
				onCoverImageFileChange={(file) => {
					form.updateCoverImageFile(file);
					clearCreateError();
				}}
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
