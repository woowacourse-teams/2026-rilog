import type {
	CologProfileFormRefs,
	CologProfileSettingsValue,
	CologProfileTextField,
	CologProfileValidationErrors,
} from '../model/colog-profile-settings';

import { COLOG_DESCRIPTION_MAX_LENGTH, COLOG_NAME_MAX_LENGTH, COLOG_NAME_MIN_LENGTH } from '@/domains/blog/model/colog';
import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

import CologProfileImageFields from './CologProfileImageFields';
import CologProfileSocialFields from './CologProfileSocialFields';

interface CologProfileFormFieldsProps {
	value: CologProfileSettingsValue;
	errors: CologProfileValidationErrors;
	refs: CologProfileFormRefs;
	isLogoRequired?: boolean;
	disabled?: boolean;
	onTextFieldChange: (field: CologProfileTextField, nextValue: string) => void;
	onLogoFileChange: (file: File | null) => void;
	onCoverImageFileChange: (file: File | null) => void;
}

export default function CologProfileFormFields({
	value,
	errors,
	refs,
	isLogoRequired = false,
	disabled = false,
	onTextFieldChange,
	onLogoFileChange,
	onCoverImageFileChange,
}: CologProfileFormFieldsProps) {
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

			<Field label="팀 이름" description="닉네임은 2~20자 사이로 입력 가능해요." required>
				{({ id, describedBy }) => (
					<Input
						id={id}
						aria-describedby={describedBy}
						ref={refs.name}
						value={value.name}
						disabled={disabled}
						required
						minLength={COLOG_NAME_MIN_LENGTH}
						maxLength={COLOG_NAME_MAX_LENGTH}
						placeholder="예: Rilog"
						status={errors.name !== undefined ? 'error' : 'default'}
						helperText={errors.name}
						onChange={(event) => onTextFieldChange('name', event.target.value)}
					/>
				)}
			</Field>

			<Field
				label="팀 고유 아이디"
				description={
					<ul className="list-disc pl-5">
						<li>아이디는 4~20자 사이로 입력 가능해요.</li>
						<li>영어와 숫자, 허용된 특수기호(-/_)만 사용 가능해요.</li>
					</ul>
				}
				required
			>
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

			<CologProfileSocialFields
				value={value}
				errors={errors}
				refs={refs}
				disabled={disabled}
				onTextFieldChange={onTextFieldChange}
			/>
		</div>
	);
}
