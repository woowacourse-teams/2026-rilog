import { useEffect, useId, useState } from 'react';

import type { RefObject } from 'react';

import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';

interface CologCreateImageFieldsProps {
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

const useImagePreviewUrl = (file: File | null, fallbackUrl: string) => {
	const [previewUrl, setPreviewUrl] = useState(fallbackUrl);

	useEffect(() => {
		if (file === null) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setPreviewUrl(fallbackUrl);
			return;
		}

		const objectUrl = URL.createObjectURL(file);
		setPreviewUrl(objectUrl);

		return () => URL.revokeObjectURL(objectUrl);
	}, [fallbackUrl, file]);

	return previewUrl;
};

export default function CologCreateImageFields({
	logoImageUrl,
	logoFile,
	coverImageUrl,
	coverImageFile,
	logoError,
	logoInputRef,
	disabled = false,
	onLogoFileChange,
	onCoverImageFileChange,
}: CologCreateImageFieldsProps) {
	const logoLabelId = useId();
	const logoErrorId = `${logoLabelId}-error`;
	const coverLabelId = useId();
	const logoPreviewUrl = useImagePreviewUrl(logoFile, logoImageUrl);
	const coverPreviewUrl = useImagePreviewUrl(coverImageFile, coverImageUrl);

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
						fit={logoFile === null ? 'contain' : 'cover'}
						loading="eager"
						sizes="100px"
						className="size-25 shrink-0"
						imageClassName={logoFile === null ? 'px-5 py-4' : undefined}
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
							required
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
