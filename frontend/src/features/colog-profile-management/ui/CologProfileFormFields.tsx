import type {
	CologProfileFormRefs,
	CologProfileSettingsValue,
	CologProfileTextField,
	CologProfileValidationErrors,
} from '../model/colog-profile-settings';

import { COLOG_DESCRIPTION_MAX_LENGTH, COLOG_NAME_MAX_LENGTH, COLOG_NAME_MIN_LENGTH } from '@/domains/blog/model/colog';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';
import ProfileSocialFields from '@/shared/ui/profile/ProfileSocialFields';
import Textarea from '@/shared/ui/textarea/Textarea';

import CologProfileImageFields from './CologProfileImageFields';

interface CologProfileFormFieldsProps {
	value: CologProfileSettingsValue;
	errors: CologProfileValidationErrors;
	refs: CologProfileFormRefs;
	isLogoRequired?: boolean;
	disabled?: boolean;
	nameAvailabilityStatus?: 'idle' | 'pending' | 'success' | 'error';
	nameAvailabilityMessage?: string;
	onTextFieldChange: (field: CologProfileTextField, nextValue: string) => void;
	onNameAvailabilityCheck: () => void;
	onLogoFileChange: (file: File | null) => void;
	onCoverImageFileChange: (file: File | null) => void;
}

export default function CologProfileFormFields({
	value,
	errors,
	refs,
	isLogoRequired = false,
	disabled = false,
	nameAvailabilityStatus = 'idle',
	nameAvailabilityMessage,
	onTextFieldChange,
	onNameAvailabilityCheck,
	onLogoFileChange,
	onCoverImageFileChange,
}: CologProfileFormFieldsProps) {
	const hasNameError = errors.name !== undefined || nameAvailabilityStatus === 'error';

	return (
		<div className="flex flex-col gap-6">
			<CologProfileImageFields
				value={value}
				errors={errors}
				logoInputRef={refs.logoFile}
				isLogoRequired={isLogoRequired}
				disabled={disabled}
				onLogoFileChange={onLogoFileChange}
				onCoverImageFileChange={onCoverImageFileChange}
			/>

			<Field label="팀 이름" description="팀 이름은 2~20자 사이로 입력 가능해요." required>
				{({ id, describedBy }) => (
					<div className="flex items-start gap-2">
						<Input
							id={id}
							aria-describedby={describedBy}
							ref={refs.name}
							value={value.name}
							disabled={disabled || nameAvailabilityStatus === 'pending'}
							required
							minLength={COLOG_NAME_MIN_LENGTH}
							maxLength={COLOG_NAME_MAX_LENGTH}
							placeholder="예: Rilog"
							status={hasNameError ? 'error' : nameAvailabilityStatus === 'success' ? 'success' : 'default'}
							helperText={errors.name ?? nameAvailabilityMessage}
							onChange={(event) => onTextFieldChange('name', event.target.value)}
						/>
						<Button
							variant="secondary"
							className="shrink-0 bg-white whitespace-nowrap"
							aria-label="팀 이름 중복 확인"
							disabled={disabled}
							isPending={nameAvailabilityStatus === 'pending'}
							onClick={onNameAvailabilityCheck}
						>
							{nameAvailabilityStatus === 'pending' ? '확인 중' : '중복 확인'}
						</Button>
					</div>
				)}
			</Field>

			<Field label="팀 고유 아이디" description="팀 고유 아이디는 변경할 수 없습니다." required>
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						ref={refs.slug}
						value={value.slug}
						disabled
						left={
							<span aria-hidden="true" className="whitespace-nowrap text-text-secondary">
								rilog.kr/@
							</span>
						}
					/>
				)}
			</Field>

			<Field label="팀 소개" description="팀을 소개하는 문장을 입력하세요.">
				{({ id, describedBy }) => (
					<div>
						<Textarea
							id={id}
							aria-describedby={describedBy}
							ref={refs.description}
							value={value.description}
							disabled={disabled}
							maxLength={COLOG_DESCRIPTION_MAX_LENGTH}
							placeholder="팀의 관심사나 목표를 소개해 주세요."
							status={errors.description !== undefined ? 'error' : 'default'}
							onChange={(event) => onTextFieldChange('description', event.target.value)}
						/>
						{errors.description !== undefined && <p className="mt-1 text-label-1 text-danger">{errors.description}</p>}
					</div>
				)}
			</Field>

			<ProfileSocialFields
				serviceUrl={value.serviceUrl ?? ''}
				githubUrl={value.githubUrl ?? ''}
				errors={errors}
				serviceUrlRef={refs.serviceUrl}
				githubUrlRef={refs.githubUrl}
				description="링크를 통해 팀을 표현해 보세요."
				disabled={disabled}
				onChange={onTextFieldChange}
			/>
		</div>
	);
}
