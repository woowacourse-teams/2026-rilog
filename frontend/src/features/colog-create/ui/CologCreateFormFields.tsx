import Image from 'next/image';
import { useState } from 'react';

import type { CologCreateFormRefs } from '../hooks/use-colog-create-form';
import type { CologCreateValue, CologProfileTextField, CologProfileValidationErrors } from '../model/colog-create';

import {
	COLOG_DESCRIPTION_MAX_LENGTH,
	COLOG_NAME_MAX_LENGTH,
	COLOG_NAME_MIN_LENGTH,
	COLOG_SLUG_MIN_LENGTH,
} from '@/domains/blog/model/colog';
import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';
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
	nameAvailabilityStatus?: 'idle' | 'pending' | 'success' | 'error';
	nameAvailabilityMessage?: string;
	slugAvailabilityStatus?: 'idle' | 'pending' | 'success' | 'error';
	slugAvailabilityMessage?: string;
	onTextFieldChange: (field: CologProfileTextField, nextValue: string) => void;
	onNameAvailabilityCheck: () => void;
	onSlugAvailabilityCheck: () => void;
	onLogoFileChange: (file: File | null) => void;
	onCoverImageFileChange: (file: File | null) => void;
}

export default function CologCreateFormFields({
	value,
	errors,
	refs,
	disabled = false,
	nameAvailabilityStatus = 'idle',
	nameAvailabilityMessage,
	slugAvailabilityStatus = 'idle',
	slugAvailabilityMessage,
	onTextFieldChange,
	onNameAvailabilityCheck,
	onSlugAvailabilityCheck,
	onLogoFileChange,
	onCoverImageFileChange,
}: CologCreateFormFieldsProps) {
	const [logoFileSizeError, setLogoFileSizeError] = useState<string | null>(null);
	const [coverImageFileSizeError, setCoverImageFileSizeError] = useState<string | null>(null);
	const logoPreviewUrl = useImagePreviewUrl(value.logoFile, value.profileImageUrl ?? '');
	const coverImagePreviewUrl = useImagePreviewUrl(value.coverImageFile, value.coverImageUrl ?? '');
	const displayedLogoError = logoFileSizeError ?? errors.logoFile;
	const hasLogoError = displayedLogoError !== undefined;
	const hasCustomLogo = value.logoFile !== null || Boolean(value.profileImageUrl);
	const hasCustomCover = value.coverImageFile !== null || Boolean(value.coverImageUrl);
	const hasNameError = errors.name !== undefined || nameAvailabilityStatus === 'error';
	const hasSlugError = errors.slug !== undefined || slugAvailabilityStatus === 'error';
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
		<div className="flex flex-col gap-6">
			<Field
				label="팀 로고"
				description={
					<ul className="list-disc pl-5">
						<li>로고 이미지는 360*360px(1:1) 사이즈를 권장해요.</li>
						<li>10MB 이하의 파일만 업로드 가능해요.</li>
					</ul>
				}
				required
			>
				{({ id, describedBy }) => (
					<div id={id} className="flex flex-col gap-2">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
							<div className="relative shrink-0">
								<ImagePreview
									src={logoPreviewUrl || '/images/colog-placeholder.svg'}
									alt="팀 로고 미리보기"
									shape="square"
									status={hasLogoError ? 'error' : 'default'}
									className="size-20 sm:size-24"
								/>
								{hasCustomLogo ? (
									<Button
										variant="danger"
										size="icon"
										aria-label="팀 로고 제거"
										disabled={disabled}
										className="absolute right-1 bottom-1 size-7! rounded-full! p-0!"
										onClick={() => handleLogoFileChange(null)}
									>
										<span aria-hidden="true" className="text-body-2 leading-none">
											×
										</span>
									</Button>
								) : null}
							</div>
							<ImageUploader
								ref={refs.logoFile}
								required
								buttonLabel="이미지 변경"
								aria-label="팀 로고 변경"
								aria-describedby={hasLogoError ? `${describedBy ?? ''} ${id}-file-error`.trim() : describedBy}
								aria-invalid={hasLogoError}
								disabled={disabled}
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
							<div className="relative">
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
								{hasCustomCover ? (
									<Button
										variant="danger"
										size="icon"
										aria-label="커버 이미지 제거"
										disabled={disabled}
										className="absolute right-1 bottom-1 size-7! rounded-full! p-0!"
										onClick={() => handleCoverImageFileChange(null)}
									>
										<span aria-hidden="true" className="text-body-2 leading-none">
											×
										</span>
									</Button>
								) : null}
							</div>
							<ImageUploader
								buttonLabel="이미지 변경"
								aria-label="커버 이미지 변경"
								aria-describedby={
									coverImageFileSizeError ? `${describedBy ?? ''} ${id}-file-error`.trim() : describedBy
								}
								aria-invalid={coverImageFileSizeError !== null}
								disabled={disabled}
								validateFile={validateImageFileSize}
								onFileRejected={(file) => {
									if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
										setCoverImageFileSizeError('커버 이미지는 10MB 이하의 이미지만 업로드할 수 있어요.');
									}
								}}
								onFileChange={handleCoverImageFileChange}
							/>
						</div>
						{coverImageFileSizeError && (
							<p id={`${id}-file-error`} role="alert" className="text-label-1 text-danger">
								{coverImageFileSizeError}
							</p>
						)}
					</div>
				)}
			</Field>

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

			<Field
				label="팀 고유 아이디"
				description={
					<ul className="list-disc pl-5">
						<li>아이디는 4~20자 사이로 입력 가능해요.</li>
						<li>영어와 숫자, 허용된 특수기호(-/_)만 사용 가능해요.</li>
						<li>아이디는 한 번 설정하면 변경할 수 없습니다.</li>
					</ul>
				}
				required
			>
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
							left={
								<span aria-hidden="true" className="whitespace-nowrap text-text-secondary">
									rilog.kr/@
								</span>
							}
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

			<fieldset className="flex flex-col gap-3" aria-describedby="social-fields-desc">
				<legend className="text-body-2 font-semibold text-text-primary">소셜</legend>
				<p id="social-fields-desc" className="text-label-2 text-text-secondary">
					링크를 통해 팀을 표현해 보세요.
				</p>

				<Field>
					{({ id, describedBy }) => (
						<Input
							id={id}
							aria-label="서비스 링크"
							aria-describedby={describedBy}
							ref={refs.serviceUrl}
							value={value.serviceUrl ?? ''}
							disabled={disabled}
							placeholder="https://example.com"
							left={<Image src="/icons/form/link.svg" alt="" width={20} height={20} className="size-5 shrink-0" />}
							status={errors.serviceUrl !== undefined ? 'error' : 'default'}
							helperText={errors.serviceUrl}
							onChange={(event) => onTextFieldChange('serviceUrl', event.target.value)}
						/>
					)}
				</Field>

				<Field>
					{({ id, describedBy }) => (
						<Input
							id={id}
							aria-label="GitHub 링크"
							aria-describedby={describedBy}
							ref={refs.githubUrl}
							value={value.githubUrl ?? ''}
							disabled={disabled}
							placeholder="https://github.com/organization"
							left={<Image src="/icons/form/github.svg" alt="" width={20} height={20} className="size-5 shrink-0" />}
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
