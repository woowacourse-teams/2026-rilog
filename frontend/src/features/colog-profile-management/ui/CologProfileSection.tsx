'use client';

import type { useCologProfileForm } from '../hooks/use-colog-profile-form';
import type { FormEvent } from 'react';

import CologProfileFormFields from './CologProfileFormFields';

interface CologProfileSectionProps {
	form: ReturnType<typeof useCologProfileForm>;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	disabled?: boolean;
	onValueChange?: () => void;
}

export default function CologProfileSection({
	form,
	onSubmit,
	disabled = false,
	onValueChange,
}: CologProfileSectionProps) {
	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<form id="profile-settings-form" noValidate onSubmit={onSubmit}>
				<div className="px-0.5">
					<div className="flex flex-col gap-8">
						<CologProfileFormFields
							value={form.value}
							errors={form.errors}
							refs={form.refs}
							disabled={disabled}
							onTextFieldChange={(field, value) => {
								form.updateTextField(field, value);
								onValueChange?.();
							}}
							onLogoFileChange={(file) => {
								form.updateLogoFile(file);
								onValueChange?.();
							}}
							onCoverImageFileChange={(file) => {
								form.updateCoverImageFile(file);
								onValueChange?.();
							}}
						/>
					</div>
				</div>
			</form>
		</section>
	);
}
