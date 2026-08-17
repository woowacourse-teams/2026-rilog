'use client';

import { useEffect, useState } from 'react';

import type { SubmitEvent } from 'react';

import { useCologProfileForm } from '@/domains/colog/hooks/use-colog-profile-form';
import CologProfileFormFields from '@/domains/colog/ui/CologProfileFormFields';
import { MOCK_COLOG_PROFILE_SETTINGS } from '@/features/colog-profile-management/lib/mock-colog-profile-settings';
import type { CologProfileSettingsValue } from '@/features/colog-profile-management/model/colog-profile-settings';
import { isCologProfileSettingsEqual } from '@/features/colog-profile-management/model/colog-profile-settings';
import Button from '@/shared/ui/button/Button';
import PageShell from '@/shared/ui/page-shell/PageShell';
import type { SettingsTab } from '@/widgets/colog-settings/lib/get-next-tab';
import CologSettingsHeader from '@/widgets/colog-settings/ui/CologSettingsHeader';

interface CologProfileSectionProps {
	initialProfile?: CologProfileSettingsValue;
	onDirtyChange?: (isDirty: boolean) => void;
	onSave?: (profile: CologProfileSettingsValue) => void;
	onTabChangeRequest?: (nextTab: SettingsTab) => void;
}

export default function CologProfileSection({
	initialProfile = MOCK_COLOG_PROFILE_SETTINGS,
	onDirtyChange,
	onSave,
	onTabChangeRequest,
}: CologProfileSectionProps) {
	const [savedProfile, setSavedProfile] = useState(() => ({ ...initialProfile }));
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
		onSave?.(normalizedValue);
	};

	return (
		<PageShell
			isHeaderSticky
			header={
				<CologSettingsHeader
					activeTab="profile"
					title="프로필"
					description="팀의 기본 정보와 소개를 관리합니다."
					onTabChangeRequest={onTabChangeRequest}
					actions={
						<Button
							form="profile-settings-form"
							type="submit"
							size="md"
							className="w-full max-w-40 sm:max-w-60 md:max-w-none lg:w-30 lg:max-w-none"
							disabled={!isDirty}
						>
							변경사항 저장
						</Button>
					}
				/>
			}
		>
			<section className="px-6 sm:px-8 lg:px-0">
				<form id="profile-settings-form" noValidate onSubmit={handleSubmit}>
					<div className="px-0.5">
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
		</PageShell>
	);
}
