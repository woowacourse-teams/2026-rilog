'use client';

import { useEffect, useState } from 'react';

import type { SubmitEvent } from 'react';

import { useCologProfileForm } from '@/domains/colog/hooks/use-colog-profile-form';
import CologProfileFormFields from '@/domains/colog/ui/CologProfileFormFields';
import { MOCK_COLOG_PROFILE_SETTINGS } from '@/features/colog-profile-management/lib/mock-colog-profile-settings';
import { isCologProfileSettingsEqual } from '@/features/colog-profile-management/model/colog-profile-settings';
import Button from '@/shared/ui/button/Button';

interface CologProfileSectionProps {
	onDirtyChange?: (isDirty: boolean) => void;
}

export default function CologProfileSection({ onDirtyChange }: CologProfileSectionProps) {
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
		<section aria-labelledby="profile-settings-title" className="flex h-full min-h-0 flex-col">
			<form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
				<div className="min-h-0 flex-1 overflow-y-auto px-0.5">
					<div className="-mx-0.5">
						<h1 id="profile-settings-title" className="text-heading-3 font-bold text-text-primary">
							프로필
						</h1>
						<p className="mt-0.5 text-body-1 text-text-secondary">팀의 기본 정보와 소개를 관리합니다.</p>
					</div>

					<div className="mt-12 flex flex-col gap-8">
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

				<div className="flex shrink-0 justify-end bg-background py-6">
					<Button type="submit" size="lg" className="w-full sm:w-48" disabled={!isDirty}>
						변경사항 저장
					</Button>
				</div>
			</form>
		</section>
	);
}
