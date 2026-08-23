import { type RefObject, useState } from 'react';

import type { CologProfileSettingsValue, CologProfileValidationErrors } from '../model/colog-profile-settings';

import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';
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
	const [logoFileSizeError, setLogoFileSizeError] = useState<string | null>(null);
	const [coverImageFileSizeError, setCoverImageFileSizeError] = useState<string | null>(null);
	const logoPreviewUrl = useImagePreviewUrl(value.logoFile, value.profileImageUrl ?? '');
	const coverImagePreviewUrl = useImagePreviewUrl(value.coverImageFile, value.coverImageUrl ?? '');
	const displayedLogoError = logoFileSizeError ?? errors?.logoFile;
	const hasLogoError = displayedLogoError !== undefined && displayedLogoError !== null;
	const hasCustomLogo = value.logoFile !== null || Boolean(value.profileImageUrl);
	const hasCustomCover = value.coverImageFile !== null || Boolean(value.coverImageUrl);
	const validateImageFileSize = (file: File) => file.size <= MAX_IMAGE_FILE_SIZE_BYTES;

	const handleLogoFileChange = (file: File | null) => {
		setLogoFileSizeError(null);
		onLogoFileChange(file);
	};

	const handleCoverImageFileChange = (file: File | null) => {
		setCoverImageFileSizeError(null);
		onCoverImageFileChange(file);
	};

	return (
		<>
			<Field
				label="팀 로고"
				description={
					<ul className="list-disc pl-5">
						<li>로고 이미지는 360*360px(1:1) 사이즈를 권장해요.</li>
						<li>10MB 이하의 파일만 업로드 가능해요.</li>
					</ul>
				}
				required={isLogoRequired}
			>
				{({ id, describedBy }) => (
					<div id={id} className="flex flex-col gap-2">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
							<div className="group relative w-fit shrink-0">
								<ImagePreview
									src={logoPreviewUrl || '/images/colog-placeholder.svg'}
									alt="팀 로고 미리보기"
									shape="square"
									status={hasLogoError ? 'error' : 'default'}
									className="size-20 sm:size-24"
								/>
								{hasCustomLogo && (
									<ImageResetOverlay
										imageLabel="팀 로고"
										disabled={disabled}
										onReset={() => handleLogoFileChange(null)}
									/>
								)}
							</div>
							<ImageEditButton
								imageLabel="팀 로고"
								hasImage={hasCustomLogo}
								inputRef={logoInputRef}
								required={isLogoRequired}
								disabled={disabled}
								aria-describedby={hasLogoError ? `${describedBy ?? ''} ${id}-file-error`.trim() : describedBy}
								aria-invalid={hasLogoError}
								validateFile={validateImageFileSize}
								onFileRejected={(file) => {
									if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
										setLogoFileSizeError('팀 로고는 10MB 이하의 이미지만 업로드할 수 있어요.');
									}
								}}
								onFileChange={handleLogoFileChange}
							/>
						</div>
						{hasLogoError && (
							<p
								id={`${id}-file-error`}
								role={logoFileSizeError ? 'alert' : undefined}
								className="text-label-1 text-danger"
							>
								{displayedLogoError}
							</p>
						)}
					</div>
				)}
			</Field>

			<Field
				label="커버 이미지"
				description={
					<ul className="list-disc pl-5">
						<li>커버 이미지는 3072*1024px(3:1) 사이즈를 권장해요.</li>
						<li>10MB 이하의 파일만 업로드 가능해요.</li>
					</ul>
				}
			>
				{({ id, describedBy }) => (
					<div id={id} className="flex flex-col gap-2">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
							<div className="group relative min-w-0">
								<ImagePreview
									src={coverImagePreviewUrl || undefined}
									alt="팀 커버 이미지 미리보기"
									shape="rectangle"
									status={coverImageFileSizeError ? 'error' : 'default'}
									className="aspect-[1/3] h-auto w-full sm:h-40 sm:w-auto"
									fallback={
										<span role="img" aria-label="기본 팀 커버 이미지" className="absolute inset-0 bg-[#DBE5F5]" />
									}
								/>
								{hasCustomCover && (
									<ImageResetOverlay
										imageLabel="커버 이미지"
										disabled={disabled}
										onReset={() => handleCoverImageFileChange(null)}
									/>
								)}
							</div>
							<div className="w-full sm:w-44 sm:shrink-0">
								<ImageEditButton
									imageLabel="커버 이미지"
									hasImage={hasCustomCover}
									disabled={disabled}
									aria-describedby={
										coverImageFileSizeError ? `${describedBy ?? ''} ${id}-file-error`.trim() : describedBy
									}
									aria-invalid={coverImageFileSizeError !== null}
									validateFile={validateImageFileSize}
									onFileRejected={(file) => {
										if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
											setCoverImageFileSizeError('커버 이미지는 10MB 이하의 이미지만 업로드할 수 있어요.');
										}
									}}
									onFileChange={handleCoverImageFileChange}
								/>
							</div>
						</div>
						{coverImageFileSizeError && (
							<p id={`${id}-file-error`} role="alert" className="text-label-1 text-danger">
								{coverImageFileSizeError}
							</p>
						)}
					</div>
				)}
			</Field>
		</>
	);
}
