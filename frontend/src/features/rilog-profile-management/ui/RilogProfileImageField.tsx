'use client';

import { useState } from 'react';

import type { RilogProfileSettingsValue } from '../model/rilog-profile-settings';
import type { RefObject } from 'react';

import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';
import { useImagePreviewUrl } from '@/shared/hooks/use-image-preview-url';
import Field from '@/shared/ui/field/Field';
import ImageEditButton from '@/shared/ui/image-edit-button/ImageEditButton';
import ImagePreview from '@/shared/ui/image-preview/ImagePreview';
import ImageResetOverlay from '@/shared/ui/image-reset-overlay/ImageResetOverlay';

interface RilogProfileImageFieldProps {
	value: RilogProfileSettingsValue;
	inputRef: RefObject<HTMLInputElement | null>;
	disabled?: boolean;
	onChange: (file: File | null) => void;
}

export default function RilogProfileImageField({
	value,
	inputRef,
	disabled = false,
	onChange,
}: RilogProfileImageFieldProps) {
	const [fileSizeError, setFileSizeError] = useState<string | null>(null);
	const previewUrl = useImagePreviewUrl(value.profileImageFile, value.profileImageUrl ?? '');
	const hasProfileImage = value.profileImageFile !== null || Boolean(value.profileImageUrl);

	const handleChange = (file: File | null) => {
		setFileSizeError(null);
		onChange(file);
	};

	return (
		<Field
			label="프로필 이미지"
			description={
				<ul className="list-disc pl-5">
					<li>프로필 이미지는 360*360px(1:1) 사이즈를 권장해요.</li>
					<li>10MB 이하의 파일만 업로드 가능해요.</li>
				</ul>
			}
		>
			{({ id, describedBy }) => (
				<div id={id} className="flex flex-col gap-2">
					<div className="flex items-end gap-4">
						<div className="group relative shrink-0">
							<ImagePreview
								src={previewUrl || '/images/profile-placeholder.svg'}
								alt="프로필 이미지 미리보기"
								shape="circle"
								status={fileSizeError === null ? 'default' : 'error'}
								fit={hasProfileImage ? 'cover' : 'contain'}
								sizes="100px"
								className="size-25 bg-background"
								imageClassName={previewUrl.startsWith('blob:') ? undefined : 'px-5 py-4'}
							/>
							{hasProfileImage && (
								<ImageResetOverlay imageLabel="프로필 이미지" disabled={disabled} onReset={() => handleChange(null)} />
							)}
						</div>
						<ImageEditButton
							imageLabel="프로필 이미지"
							hasImage={hasProfileImage}
							inputRef={inputRef}
							disabled={disabled}
							aria-describedby={fileSizeError ? `${describedBy ?? ''} ${id}-file-error`.trim() : describedBy}
							aria-invalid={fileSizeError !== null}
							validateFile={(file) => file.size <= MAX_IMAGE_FILE_SIZE_BYTES}
							onFileRejected={(file) => {
								if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
									setFileSizeError('프로필 이미지는 10MB 이하의 이미지만 업로드할 수 있어요.');
								}
							}}
							onFileChange={(file) => handleChange(file)}
						/>
					</div>
					{fileSizeError && (
						<p id={`${id}-file-error`} role="alert" className="text-label-1 text-danger">
							{fileSizeError}
						</p>
					)}
				</div>
			)}
		</Field>
	);
}
