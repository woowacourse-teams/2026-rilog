import type { CologCreateFormRefs } from '../hooks/use-colog-create-form';
import type { CologCreateValue, CologProfileTextField, CologProfileValidationErrors } from '../model/colog-create';

import {
	COLOG_DESCRIPTION_MAX_LENGTH,
	COLOG_NAME_MAX_LENGTH,
	COLOG_NAME_MIN_LENGTH,
	COLOG_SLUG_MIN_LENGTH,
} from '@/domains/blog/model/colog';
import { useImagePreviewUrl } from '@/shared/hooks/use-image-preview-url';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';
import Input from '@/shared/ui/input/Input';
import Textarea from '@/shared/ui/textarea/Textarea';

interface CologCreateFormFieldsProps {
	value: CologCreateValue;
	errors: CologProfileValidationErrors;
	refs: CologCreateFormRefs;
	disabled?: boolean;
	slugAvailabilityStatus?: 'idle' | 'pending' | 'success' | 'error';
	slugAvailabilityMessage?: string;
	onTextFieldChange: (field: CologProfileTextField, nextValue: string) => void;
	onSlugAvailabilityCheck: () => void;
	onLogoFileChange: (file: File | null) => void;
	onCoverImageFileChange: (file: File | null) => void;
}

export default function CologCreateFormFields({
	value,
	errors,
	refs,
	disabled = false,
	slugAvailabilityStatus = 'idle',
	slugAvailabilityMessage,
	onTextFieldChange,
	onSlugAvailabilityCheck,
	onLogoFileChange,
	onCoverImageFileChange,
}: CologCreateFormFieldsProps) {
	const logoPreviewUrl = useImagePreviewUrl(value.logoFile, value.profileImageUrl ?? '');
	const coverImagePreviewUrl = useImagePreviewUrl(value.coverImageFile, value.coverImageUrl ?? '');
	const hasLogoError = errors.logoFile !== undefined;
	const hasCustomLogo = value.logoFile !== null || Boolean(value.profileImageUrl);
	const hasCustomCover = value.coverImageFile !== null || Boolean(value.coverImageUrl);
	const hasSlugError = errors.slug !== undefined || slugAvailabilityStatus === 'error';

	return (
		<div className="flex flex-col gap-6">
			<Field label="팀 로고" description="팀을 대표하는 로고 이미지를 등록해 주세요.">
				{({ id }) => (
					<div id={id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
						<ImagePreview
							src={logoPreviewUrl || '/images/profile-placeholder.svg'}
							alt="팀 로고 미리보기"
							shape="circle"
							status={hasLogoError ? 'error' : 'default'}
							className="size-20 sm:size-24"
						/>
						<div className="flex flex-col gap-2">
							<div className="flex flex-wrap items-center gap-2">
								<ImageUploader
									ref={refs.logoFile}
									required
									buttonLabel="팀 로고 변경"
									disabled={disabled}
									onFileChange={(file) => onLogoFileChange(file)}
								/>
								{hasCustomLogo && (
									<Button
										type="button"
										variant="secondary"
										size="md"
										disabled={disabled}
										onClick={() => onLogoFileChange(null)}
									>
										기본 이미지로 변경
									</Button>
								)}
							</div>
							{hasLogoError && <p className="text-label-1 text-danger">{errors.logoFile}</p>}
						</div>
					</div>
				)}
			</Field>

			<Field label="커버 이미지" description="팀 페이지 상단에 노출될 커버 이미지를 등록해 주세요.">
				{({ id }) => (
					<div id={id} className="flex flex-col gap-3">
						<ImagePreview
							src={coverImagePreviewUrl || '/images/team-cover-placeholder.svg'}
							alt="팀 커버 이미지 미리보기"
							shape="rectangle"
							className="h-32 w-full sm:h-40"
						/>
						<div className="flex flex-wrap items-center gap-2">
							<ImageUploader
								buttonLabel="커버 이미지 변경"
								disabled={disabled}
								onFileChange={(file) => onCoverImageFileChange(file)}
							/>
							{hasCustomCover && (
								<Button
									type="button"
									variant="secondary"
									size="md"
									disabled={disabled}
									onClick={() => onCoverImageFileChange(null)}
								>
									기본 이미지로 변경
								</Button>
							)}
						</div>
					</div>
				)}
			</Field>

			<Field label="팀 이름" description="서비스에 표시될 팀의 이름입니다.">
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
						placeholder="예: Rilog 프론트엔드 팀"
						status={errors.name !== undefined ? 'error' : 'default'}
						helperText={errors.name}
						onChange={(event) => onTextFieldChange('name', event.target.value)}
					/>
				)}
			</Field>

			<Field label="팀 고유 아이디" description="팀 페이지 URL에 사용될 고유한 식별자입니다.">
				{({ id, describedBy }) => (
					<div className="flex items-start gap-2">
						<Input
							id={id}
							aria-describedby={describedBy}
							ref={refs.slug}
							value={value.slug}
							disabled={disabled || slugAvailabilityStatus === 'pending'}
							required
							minLength={COLOG_SLUG_MIN_LENGTH}
							maxLength={COLOG_NAME_MAX_LENGTH}
							pattern="[a-z0-9-]+"
							placeholder="예: rilog-fe"
							status={hasSlugError ? 'error' : slugAvailabilityStatus === 'success' ? 'success' : 'default'}
							helperText={errors.slug ?? slugAvailabilityMessage}
							onChange={(event) => onTextFieldChange('slug', event.target.value)}
						/>
						<Button
							variant="secondary"
							className="shrink-0 bg-white whitespace-nowrap"
							aria-label="팀 고유 아이디 중복 확인"
							disabled={disabled}
							isPending={slugAvailabilityStatus === 'pending'}
							onClick={onSlugAvailabilityCheck}
						>
							{slugAvailabilityStatus === 'pending' ? '확인 중' : '중복 확인'}
						</Button>
					</div>
				)}
			</Field>

			<Field label="팀 소개 (선택)" description="팀을 소개해 보세요.">
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
			</fieldset>
		</div>
	);
}
