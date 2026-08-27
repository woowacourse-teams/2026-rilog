import { useState, type FormEvent } from 'react';

import type { RilogProfileSettingsValue, RilogProfileTextField } from '../model/rilog-profile-settings';

import { normalizeUserNickname } from '@/domains/user/lib/validate-user-profile';

import { saveMockRilogProfile } from '../lib/mock-save-rilog-profile';
import { isRilogProfileSettingsEqual } from '../lib/validate-rilog-profile-settings';

import { useRilogProfileForm } from './use-rilog-profile-form';

interface UseRilogProfileManagementOptions {
	initialProfile: RilogProfileSettingsValue;
}

export const useRilogProfileManagement = ({ initialProfile }: UseRilogProfileManagementOptions) => {
	const [savedProfile, setSavedProfile] = useState<RilogProfileSettingsValue>(() => initialProfile);
	const [confirmedNickname, setConfirmedNickname] = useState<string | null>(null);
	const [isNicknameAvailabilityRequired, setIsNicknameAvailabilityRequired] = useState(false);
	const form = useRilogProfileForm({ initialValue: initialProfile });
	const normalizedCurrentNickname = normalizeUserNickname(form.value.nickname);
	const isNicknameConfirmed = confirmedNickname === normalizedCurrentNickname;
	const isDirty = !isRilogProfileSettingsEqual(form.value, savedProfile);

	const handleTextFieldChange = (field: RilogProfileTextField, value: string) => {
		form.updateTextField(field, value);
		if (field === 'nickname') {
			setIsNicknameAvailabilityRequired(false);
		}
	};

	const handleNicknameAvailabilityCheck = () => {
		setIsNicknameAvailabilityRequired(false);
		const nickname = form.validateNickname();
		if (nickname === null) {
			return;
		}

		form.setValue({ ...form.value, nickname });
		setConfirmedNickname(nickname);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const normalizedValue = form.validate();
		if (normalizedValue === null) {
			return;
		}

		const hasNicknameChanged = normalizedValue.nickname !== normalizeUserNickname(savedProfile.nickname);
		if (hasNicknameChanged && confirmedNickname !== normalizedValue.nickname) {
			setIsNicknameAvailabilityRequired(true);
			form.refs.nickname.current?.focus();
			return;
		}

		const nextSavedProfile = saveMockRilogProfile(normalizedValue);
		form.setValue(nextSavedProfile);
		setSavedProfile(nextSavedProfile);
		setConfirmedNickname(null);
		setIsNicknameAvailabilityRequired(false);
	};

	const resetToSavedProfile = () => {
		form.setValue(savedProfile);
		setConfirmedNickname(null);
		setIsNicknameAvailabilityRequired(false);
	};

	return {
		form,
		savedProfile,
		isDirty,
		isNicknameAvailabilityRequired,
		isNicknameConfirmed,
		handleTextFieldChange,
		handleNicknameAvailabilityCheck,
		handleSubmit,
		resetToSavedProfile,
	};
};
