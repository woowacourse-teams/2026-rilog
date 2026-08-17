'use client';

import { useEffect, useState } from 'react';

import type { SubmitEvent } from 'react';

import { useCologProfileForm } from '@/domains/colog/hooks/use-colog-profile-form';
import CologProfileFormFields from '@/domains/colog/ui/CologProfileFormFields';
import { MOCK_COLOG_PROFILE_SETTINGS } from '@/features/colog-profile-management/lib/mock-colog-profile-settings';
import { isCologProfileSettingsEqual } from '@/features/colog-profile-management/model/colog-profile-settings';

interface CologProfileSectionProps {
	onDirtyChange?: (isDirty: boolean) => void;
	showHeading?: boolean;
}

export default function CologProfileSection({ onDirtyChange, showHeading = true }: CologProfileSectionProps) {
	const [savedProfile, setSavedProfile] = useState(() => ({ ...MOCK_COLOG_PROFILE_SETTINGS }));
	const form = useCologProfileForm({ initialValue: savedProfile });
	const isDirty = !isCologProfileSettingsEqual(form.value, savedProfile);

	useEffect(() => {
		onDirtyChange?.(isDirty);
	}, [isDirty, onDirtyChange]);

	useEffect(
		() => () => {
			onDirtyChange?.(false);
		},
		[onDirtyChange],
	);

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const normalizedValue = form.validate();

		if (normalizedValue === null) {
			return;
		}

		setSavedProfile(normalizedValue);
	};

	return (
		<section aria-labelledby="profile-settings-title">
			<form id="profile-settings-form" noValidate onSubmit={handleSubmit}>
				<div className="px-0.5">
					{showHeading && (
						<div className="mb-8">
							<h1 id="profile-settings-title" className="text-heading-3 font-bold text-text-primary">
								프로필
							</h1>
							<p className="mt-0.5 text-body-1 text-text-secondary">팀의 기본 정보와 소개를 관리합니다.</p>
						</div>
					)}
					<div className="flex flex-col gap-8">
						<CologProfileFormFields
							value={form.value}
							errors={form.errors}
							refs={form.refs}
							onTextFieldChange={form.updateTextField}
							onLogoFileChange={form.updateLogoFile}
							onCoverImageFileChange={form.updateCoverImageFile}
						/>
					</div>
				</div>
			</form>
		</section>
	);
}
