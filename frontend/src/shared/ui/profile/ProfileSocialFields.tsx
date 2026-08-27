import Image from 'next/image';

import type { RefObject } from 'react';

import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';

type ProfileSocialField = 'serviceUrl' | 'githubUrl';

interface ProfileSocialFieldsProps {
	serviceUrl: string;
	githubUrl: string;
	maxLength: number;
	errors: Partial<Record<ProfileSocialField, string>>;
	serviceUrlRef: RefObject<HTMLInputElement | null>;
	githubUrlRef: RefObject<HTMLInputElement | null>;
	description: string;
	disabled?: boolean;
	onChange: (field: ProfileSocialField, value: string) => void;
}

export default function ProfileSocialFields({
	serviceUrl,
	githubUrl,
	maxLength,
	errors,
	serviceUrlRef,
	githubUrlRef,
	description,
	disabled = false,
	onChange,
}: ProfileSocialFieldsProps) {
	return (
		<fieldset className="flex flex-col gap-3" aria-describedby="profile-social-fields-description">
			<legend className="text-body-2 font-semibold text-text-primary">소셜</legend>
			<p id="profile-social-fields-description" className="text-label-2 text-text-secondary">
				{description}
			</p>

			<Field>
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-label="서비스 링크"
						aria-describedby={describedBy}
						ref={serviceUrlRef}
						name="serviceUrl"
						value={serviceUrl}
						disabled={disabled}
						maxLength={maxLength}
						placeholder="https://example.com"
						left={<Image src="/icons/form/link.svg" alt="" width={20} height={20} className="size-5 shrink-0" />}
						status={errors.serviceUrl !== undefined ? 'error' : 'default'}
						helperText={errors.serviceUrl}
						onChange={(event) => onChange('serviceUrl', event.target.value)}
					/>
				)}
			</Field>

			<Field>
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-label="GitHub 링크"
						aria-describedby={describedBy}
						ref={githubUrlRef}
						name="githubUrl"
						value={githubUrl}
						disabled={disabled}
						maxLength={maxLength}
						placeholder="https://github.com/organization"
						left={<Image src="/icons/form/github.svg" alt="" width={20} height={20} className="size-5 shrink-0" />}
						status={errors.githubUrl !== undefined ? 'error' : 'default'}
						helperText={errors.githubUrl}
						onChange={(event) => onChange('githubUrl', event.target.value)}
					/>
				)}
			</Field>
		</fieldset>
	);
}
