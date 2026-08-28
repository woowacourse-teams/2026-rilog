'use client';

import type { useRilogProfileForm } from '../hooks/use-rilog-profile-form';
import type { RilogProfileTextField } from '../model/rilog-profile-settings';
import type { FormEvent } from 'react';

import RilogProfileFormFields from './RilogProfileFormFields';

interface RilogProfileSectionProps {
	form: ReturnType<typeof useRilogProfileForm>;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	disabled?: boolean;
	onValueChange?: (field?: RilogProfileTextField) => void;
	nicknameAvailabilityStatus?: 'idle' | 'pending' | 'success' | 'error';
	nicknameAvailabilityMessage?: string;
	onNicknameAvailabilityCheck: () => void;
}

export default function RilogProfileSection({
	form,
	onSubmit,
	disabled = false,
	onValueChange,
	nicknameAvailabilityStatus = 'idle',
	nicknameAvailabilityMessage,
	onNicknameAvailabilityCheck,
}: RilogProfileSectionProps) {
	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<form id="profile-settings-form" noValidate onSubmit={onSubmit}>
				<RilogProfileFormFields
					value={form.value}
					errors={form.errors}
					refs={form.refs}
					disabled={disabled}
					nicknameAvailabilityStatus={nicknameAvailabilityStatus}
					nicknameAvailabilityMessage={nicknameAvailabilityMessage}
					onTextFieldChange={(field, value) => {
						form.updateTextField(field, value);
						onValueChange?.(field);
					}}
					onProfileImageChange={(file) => {
						form.updateProfileImageFile(file);
						onValueChange?.();
					}}
					onNicknameAvailabilityCheck={onNicknameAvailabilityCheck}
				/>
			</form>
		</section>
	);
}
