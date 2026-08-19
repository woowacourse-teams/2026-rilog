import type { CologProfileSettingsValue, CologProfileValidationErrors } from '../model/colog-profile-settings';
import type { RefObject } from 'react';

import { useImagePreviewUrl } from '@/shared/hooks/use-image-preview-url';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';

interface CologProfileImageFieldsProps {
	value: CologProfileSettingsValue;
	errors?: CologProfileValidationErrors;
	logoInputRef?: RefObject<HTMLInputElement | null>;
	isLogoRequired?: boolean;
	disabled?: boolean;
	onLogoFileChange: (file: File | null) => void;
	onCoverImageFileChange: (file: File | null) => void;
}

export default function CologProfileImageFields({
	value,
	errors,
	logoInputRef,
	isLogoRequired = false,
	disabled = false,
	onLogoFileChange,
	onCoverImageFileChange,
}: CologProfileImageFieldsProps) {
	const logoPreviewUrl = useImagePreviewUrl(value.logoFile, value.profileImageUrl ?? '');
	const coverImagePreviewUrl = useImagePreviewUrl(value.coverImageFile, value.coverImageUrl ?? '');
	const hasLogoError = errors?.logoFile !== undefined;
	const hasCustomLogo = value.logoFile !== null || Boolean(value.profileImageUrl);
	const hasCustomCover = value.coverImageFile !== null || Boolean(value.coverImageUrl);

	return (
		<>
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
									ref={logoInputRef}
									required={isLogoRequired}
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
		</>
	);
}
