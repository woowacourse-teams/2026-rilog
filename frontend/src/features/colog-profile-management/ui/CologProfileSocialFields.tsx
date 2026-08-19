import type {
	CologProfileFormRefs,
	CologProfileSettingsValue,
	CologProfileTextField,
	CologProfileValidationErrors,
} from '../model/colog-profile-settings';

import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';

interface CologProfileSocialFieldsProps {
	value: CologProfileSettingsValue;
	errors: CologProfileValidationErrors;
	refs: CologProfileFormRefs;
	disabled?: boolean;
	onTextFieldChange: (field: CologProfileTextField, nextValue: string) => void;
}

export default function CologProfileSocialFields({
	value,
	errors,
	refs,
	disabled = false,
	onTextFieldChange,
}: CologProfileSocialFieldsProps) {
	return (
		<fieldset className="flex flex-col gap-6" aria-describedby="social-fields-desc">
			<legend className="text-body-2 font-semibold text-text-primary">소셜 (선택)</legend>
			<p id="social-fields-desc" className="text-label-2 text-text-secondary">
				링크를 통해 팀을 표현해 보세요.
			</p>

			<Field label="서비스 링크">
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						ref={refs.serviceUrl}
						value={value.serviceUrl ?? ''}
						disabled={disabled}
						placeholder="https://example.com"
						status={errors.serviceUrl !== undefined ? 'error' : 'default'}
						helperText={errors.serviceUrl}
						onChange={(event) => onTextFieldChange('serviceUrl', event.target.value)}
					/>
				)}
			</Field>

			<Field label="GitHub 링크">
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						ref={refs.githubUrl}
						value={value.githubUrl ?? ''}
						disabled={disabled}
						placeholder="https://github.com/organization"
						status={errors.githubUrl !== undefined ? 'error' : 'default'}
						helperText={errors.githubUrl}
						onChange={(event) => onTextFieldChange('githubUrl', event.target.value)}
					/>
				)}
			</Field>

			<Field label="이메일">
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						ref={refs.email}
						type="email"
						value={value.email ?? ''}
						disabled={disabled}
						placeholder="team@example.com"
						status={errors.email !== undefined ? 'error' : 'default'}
						helperText={errors.email}
						onChange={(event) => onTextFieldChange('email', event.target.value)}
					/>
				)}
			</Field>
		</fieldset>
	);
}
