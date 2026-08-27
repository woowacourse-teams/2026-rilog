import type {
	RilogProfileFormRefs,
	RilogProfileSettingsValue,
	RilogProfileValidationErrors,
} from '../model/rilog-profile-settings';

import { BLOG_PROFILE_URL_MAX_LENGTH } from '@/domains/blog/model/blog';
import { USER_NICKNAME_MAX_LENGTH, USER_NICKNAME_MIN_LENGTH } from '@/domains/user/lib/validate-user-profile';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';
import ProfileSocialFields from '@/shared/ui/profile/ProfileSocialFields';
import Textarea from '@/shared/ui/textarea/Textarea';

import { RILOG_DESCRIPTION_MAX_LENGTH } from '../model/rilog-profile-settings';

import RilogProfileImageField from './RilogProfileImageField';

interface RilogProfileFormFieldsProps {
	value: RilogProfileSettingsValue;
	errors: RilogProfileValidationErrors;
	refs: RilogProfileFormRefs;
	nicknameAvailabilityStatus: 'idle' | 'pending' | 'success' | 'error';
	nicknameAvailabilityMessage?: string;
	disabled?: boolean;
	onTextFieldChange: (field: 'nickname' | 'description' | 'serviceUrl' | 'githubUrl', value: string) => void;
	onProfileImageChange: (file: File | null) => void;
	onNicknameAvailabilityCheck: () => void;
}

export default function RilogProfileFormFields({
	value,
	errors,
	refs,
	nicknameAvailabilityStatus,
	nicknameAvailabilityMessage,
	disabled = false,
	onTextFieldChange,
	onProfileImageChange,
	onNicknameAvailabilityCheck,
}: RilogProfileFormFieldsProps) {
	const hasNicknameError = errors.nickname !== undefined || nicknameAvailabilityStatus === 'error';

	return (
		<div className="flex flex-col gap-6">
			<RilogProfileImageField
				value={value}
				inputRef={refs.profileImageFile}
				disabled={disabled}
				onChange={onProfileImageChange}
			/>

			<Field label="닉네임" description="닉네임은 2~20자 사이로 입력 가능해요." required>
				{({ id, describedBy }) => (
					<div className="flex items-start gap-2">
						<Input
							id={id}
							aria-describedby={describedBy}
							ref={refs.nickname}
							value={value.nickname}
							disabled={disabled || nicknameAvailabilityStatus === 'pending'}
							required
							minLength={USER_NICKNAME_MIN_LENGTH}
							maxLength={USER_NICKNAME_MAX_LENGTH}
							placeholder="예: 리로그"
							autoComplete="nickname"
							status={hasNicknameError ? 'error' : nicknameAvailabilityStatus === 'success' ? 'success' : 'default'}
							helperText={errors.nickname ?? nicknameAvailabilityMessage}
							onChange={(event) => onTextFieldChange('nickname', event.target.value)}
						/>
						<Button
							type="button"
							variant="secondary"
							className="shrink-0 bg-white whitespace-nowrap"
							aria-label="닉네임 중복 확인"
							disabled={disabled}
							isPending={nicknameAvailabilityStatus === 'pending'}
							onClick={onNicknameAvailabilityCheck}
						>
							{nicknameAvailabilityStatus === 'pending' ? '확인 중' : '중복 확인'}
						</Button>
					</div>
				)}
			</Field>

			<Field label="고유 아이디" description="고유 아이디는 변경할 수 없습니다." required>
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

			<Field label="소개" description="나를 소개하는 문장을 입력하세요.">
				{({ id, describedBy }) => (
					<div>
						<Textarea
							id={id}
							aria-describedby={describedBy}
							ref={refs.description}
							value={value.description ?? ''}
							disabled={disabled}
							maxLength={RILOG_DESCRIPTION_MAX_LENGTH}
							placeholder="나를 소개해 주세요."
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
				maxLength={BLOG_PROFILE_URL_MAX_LENGTH}
				errors={errors}
				serviceUrlRef={refs.serviceUrl}
				githubUrlRef={refs.githubUrl}
				description="링크를 통해 나를 표현해 보세요."
				disabled={disabled}
				onChange={onTextFieldChange}
			/>
		</div>
	);
}
