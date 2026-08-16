import { useId } from 'react';

import type { RefObject } from 'react';

import { useImagePreviewUrl } from '@/shared/hooks/use-image-preview-url';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';

const LOGO_PLACEHOLDER_URL = '/images/profile-placeholder.svg';
const COVER_PLACEHOLDER_URL = '/images/team-cover-placeholder.svg';

interface CologProfileImageFieldsProps {
	logoImageUrl: string;
	logoFile: File | null;
	coverImageUrl: string;
	coverImageFile: File | null;
	logoError?: string;
	logoInputRef: RefObject<HTMLInputElement | null>;
	disabled?: boolean;
	onLogoFileChange: (file: File | null) => void;
	onCoverImageFileChange: (file: File | null) => void;
}

export default function CologProfileImageFields({
	logoImageUrl,
	logoFile,
	coverImageUrl,
	coverImageFile,
	logoError,
	logoInputRef,
	disabled = false,
	onLogoFileChange,
	onCoverImageFileChange,
}: CologProfileImageFieldsProps) {
	const logoLabelId = useId();
	const logoErrorId = `${logoLabelId}-error`;
	const coverLabelId = useId();
	const logoFallbackUrl = logoImageUrl || LOGO_PLACEHOLDER_URL;
	const coverFallbackUrl = coverImageUrl || COVER_PLACEHOLDER_URL;
	const logoPreviewUrl = useImagePreviewUrl(logoFile, logoFallbackUrl);
	const coverPreviewUrl = useImagePreviewUrl(coverImageFile, coverFallbackUrl);
	const hasCustomLogo = logoFile !== null || (logoImageUrl !== '' && logoImageUrl !== LOGO_PLACEHOLDER_URL);

	return (
		<>
			<div role="group" aria-labelledby={logoLabelId} className="flex max-w-71.5 flex-col gap-3">
				<p id={logoLabelId} className="text-body-2 font-semibold text-text-primary">
					팀 로고
				</p>
				<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
					<ImagePreview
						src={logoPreviewUrl}
						alt="팀 로고 미리보기"
						fit={hasCustomLogo ? 'cover' : 'contain'}
						status={logoError === undefined ? 'default' : 'error'}
						loading="eager"
						sizes="100px"
						className="size-25 shrink-0"
						imageClassName={hasCustomLogo ? undefined : 'px-5 py-4'}
					/>
					<div className="w-full sm:flex-1">
						<ImageUploader
							ref={logoInputRef}
							name="logoFile"
							buttonLabel="팀 로고 변경"
							aria-describedby={logoError === undefined ? undefined : logoErrorId}
							aria-invalid={logoError === undefined ? undefined : true}
							disabled={disabled}
							onFileChange={onLogoFileChange}
							fullWidth
							className="sm:w-44"
							required={logoImageUrl.trim() === ''}
						/>
					</div>
				</div>
				{logoError !== undefined && (
					<p id={logoErrorId} className="text-label-1 text-danger">
						{logoError}
					</p>
				)}
			</div>

			<div role="group" aria-labelledby={coverLabelId} className="flex flex-col gap-3">
				<p id={coverLabelId} className="text-body-2 font-semibold text-text-primary">
					커버 이미지 (선택)
				</p>
				<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
					<ImagePreview
						src={coverPreviewUrl}
						alt="팀 커버 이미지 미리보기"
						shape="rectangle"
						fit="cover"
						loading="eager"
						sizes="(max-width: 640px) 100vw, 418px"
						className="w-full max-w-104.5"
					/>
					<div className="w-full sm:w-auto">
						<ImageUploader
							name="coverImageFile"
							buttonLabel="커버 이미지 변경"
							disabled={disabled}
							onFileChange={onCoverImageFileChange}
							fullWidth
							className="sm:w-44"
						/>
					</div>
				</div>
			</div>
		</>
	);
}
