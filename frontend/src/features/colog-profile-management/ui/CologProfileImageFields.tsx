import type { CologProfileSettingsValue, CologProfileValidationErrors } from '../model/colog-profile-settings';
import type { RefObject } from 'react';

import { useImagePreviewUrl } from '@/shared/hooks/use-image-preview-url';
import Field from '@/shared/ui/field/Field';
import ImageEditButton from '@/shared/ui/image-edit-button/ImageEditButton';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageResetOverlay from '@/shared/ui/image-reset-overlay/ImageResetOverlay';

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
			<Field label="팀 로고" required={isLogoRequired}>
				{({ id }) => (
					<div id={id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
						<div className="group relative w-fit shrink-0">
							<ImagePreview
								src={logoPreviewUrl || '/images/profile-placeholder.svg'}
								alt="팀 로고 미리보기"
								shape="square"
								status={hasLogoError ? 'error' : 'default'}
								className="size-20 sm:size-24"
							/>
							{hasCustomLogo && (
								<ImageResetOverlay imageLabel="팀 로고" disabled={disabled} onReset={() => onLogoFileChange(null)} />
							)}
						</div>
						<div className="flex flex-col gap-2">
							<ImageEditButton
								imageLabel="팀 로고"
								hasImage={hasCustomLogo}
								inputRef={logoInputRef}
								required={isLogoRequired}
								disabled={disabled}
								onFileChange={onLogoFileChange}
							/>
							{hasLogoError && <p className="text-label-1 text-danger">{errors.logoFile}</p>}
						</div>
					</div>
				)}
			</Field>

			<Field label="커버 이미지">
				{({ id }) => (
					<div id={id} className="group relative">
						<ImagePreview
							src={coverImagePreviewUrl || undefined}
							alt="팀 커버 이미지 미리보기"
							shape="rectangle"
							className="h-32 w-full sm:h-40"
							fallback={<span role="img" aria-label="기본 팀 커버 이미지" className="absolute inset-0 bg-[#DBE5F5]" />}
						/>
						{hasCustomCover && (
							<ImageResetOverlay
								imageLabel="커버 이미지"
								disabled={disabled}
								onReset={() => onCoverImageFileChange(null)}
							/>
						)}
						<ImageEditButton
							imageLabel="커버 이미지"
							hasImage={hasCustomCover}
							disabled={disabled}
							className="absolute right-3 bottom-3 z-30"
							onFileChange={onCoverImageFileChange}
						/>
					</div>
				)}
			</Field>
		</>
	);
}
