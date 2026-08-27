'use client';

import type { useRilogProfileManagement } from '../hooks/use-rilog-profile-management';

import RilogProfileFormFields from './RilogProfileFormFields';

interface RilogProfileSectionProps {
	management: ReturnType<typeof useRilogProfileManagement>;
}

export default function RilogProfileSection({ management }: RilogProfileSectionProps) {
	const nicknameAvailabilityStatus = management.isNicknameAvailabilityRequired
		? 'error'
		: management.isNicknameConfirmed
			? 'success'
			: 'idle';
	const nicknameAvailabilityMessage = management.isNicknameAvailabilityRequired
		? '닉네임 중복 확인이 필요합니다.'
		: management.isNicknameConfirmed
			? '사용 가능한 닉네임입니다.'
			: undefined;

	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<form id="rilog-profile-settings-form" noValidate onSubmit={management.handleSubmit}>
				<RilogProfileFormFields
					value={management.form.value}
					errors={management.form.errors}
					refs={management.form.refs}
					nicknameAvailabilityStatus={nicknameAvailabilityStatus}
					nicknameAvailabilityMessage={nicknameAvailabilityMessage}
					onTextFieldChange={management.handleTextFieldChange}
					onProfileImageChange={management.form.updateProfileImageFile}
					onNicknameAvailabilityCheck={management.handleNicknameAvailabilityCheck}
				/>
			</form>
		</section>
	);
}
