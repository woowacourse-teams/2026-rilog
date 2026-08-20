'use client';

import { useEffect, useId, useRef } from 'react';

import type { PublicationSettings } from '../model/post-publication';
import type { Block } from '@blocknote/core';
import type { ChangeEvent } from 'react';

import type { CologOption } from '@/domains/blog/model/colog';
import { POST_CATEGORY_OPTIONS, type PostCategory } from '@/domains/post/model/post';
import Button from '@/shared/ui/button/Button';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';
import Modal from '@/shared/ui/modal/Modal';

import { getImageUrl } from '@/shared/utils/get-image-url';

import { resolveRepresentativeImagePreview } from '../lib/resolve-representative-image';

interface PublishSettingsModalProps {
	open: boolean;
	postTitle: string;
	settings: PublicationSettings;
	selectedImageUrl: string | null;
	bodyBlocks: Block[];
	defaultImageUrl: string;
	cologOptions: CologOption[];
	cologError?: string;
	publishError?: string;
	isPublishing: boolean;
	onClose: () => void;
	onCategoryChange: (category: PostCategory) => void;
	onCoLogChange: (blog: CologOption | null) => void;
	onImageChange: (file: File | null) => void;
	onPublish: () => void;
}

// 모달 footer의 발행 버튼을 내부 form과 연결하는 ID
const PUBLISH_FORM_ID = 'post-publish-settings-form';

export default function PublishSettingsModal({
	open,
	postTitle,
	settings,
	selectedImageUrl,
	bodyBlocks,
	defaultImageUrl,
	cologOptions,
	cologError,
	publishError,
	isPublishing,
	onClose,
	onCategoryChange,
	onCoLogChange,
	onImageChange,
	onPublish,
}: PublishSettingsModalProps) {
	// Co-log select와 검증 메시지를 연결하는 고유 ID
	const cologErrorId = useId();
	// 제출 시 Co-log가 비어 있으면 해당 select로 focus하기 위한 ref
	const cologSelectRef = useRef<HTMLSelectElement>(null);
	// 선택 이미지, 본문 첫 이미지, 기본 이미지 순서로 최종 썸네일 URL 결정
	const previewUrl = resolveRepresentativeImagePreview(selectedImageUrl, bodyBlocks, defaultImageUrl);
	// 선택 가능한 Co-log가 하나뿐일 때 자동 선택할 blog
	const onlyBlog = cologOptions.length === 1 ? cologOptions[0] : undefined;

	// 모달을 열었을 때 유일한 Co-log가 있고 기존 선택값이 없다면 자동 선택
	useEffect(() => {
		if (open && settings.blog === null && onlyBlog !== undefined) {
			onCoLogChange(onlyBlog);
		}
	}, [onlyBlog, onCoLogChange, open, settings.blog]);

	// React form action으로 제출을 처리하고 필수 설정의 focus 처리 후 실제 발행 요청을 부모에 위임
	const handleSubmit = () => {
		if (settings.blog === null) {
			cologSelectRef.current?.focus();
		}

		onPublish();
	};

	// 공용 ImageUploader가 label과 숨겨진 file input의 연결을 소유하며 같은 파일을 다시 선택할 수 있도록 초기화
	const resetFileInput = (event: ChangeEvent<HTMLInputElement>) => {
		event.currentTarget.value = '';
	};

	return (
		<Modal
			open={open}
			title="게시 설정"
			description="발행 전에 게시글 정보를 확인해 주세요."
			onClose={onClose}
			size="xl"
			padding="xl"
			scrollMode="custom"
			showCloseButton={false}
			closeOnBackdrop={false}
			isPending={isPublishing}
			cancelAction={{}}
			primaryAction={{ label: '발행', type: 'submit', form: PUBLISH_FORM_ID }}
		>
			<form id={PUBLISH_FORM_ID} className="-mx-1 max-h-[min(60dvh,38rem)] overflow-y-auto p-1" action={handleSubmit}>
				<div className="grid gap-8 md:grid-cols-2 md:gap-10">
					<section aria-labelledby="representative-image-label">
						<div>
							<h3 id="representative-image-label" className="text-label-2 font-semibold text-text-primary">
								대표 이미지
							</h3>
							<p className="mt-1 text-caption-1 text-text-secondary">직접 선택한 이미지만 대표 이미지로 저장됩니다.</p>
							<div
								className={`mt-4 grid gap-2 ${settings.representativeImage === null ? 'grid-cols-1' : 'grid-cols-2'}`}
							>
								{/* 브라우저에서 선택한 첫 이미지 파일은 공용 ImageUploader를 통해 부모에 전달됩니다. */}
								<ImageUploader
									fullWidth
									buttonLabel={settings.representativeImage === null ? '이미지 선택' : '이미지 변경'}
									disabled={isPublishing}
									onChange={resetFileInput}
									onFileChange={onImageChange}
								/>
								{settings.representativeImage !== null && (
									<Button
										size="md"
										variant="ghost"
										className="w-full focus-visible:-outline-offset-2"
										disabled={isPublishing}
										onClick={() => onImageChange(null)}
									>
										이미지 제거
									</Button>
								)}
							</div>
						</div>
						<figure
							aria-label="게시글 썸네일 미리보기"
							className="mt-5 overflow-hidden rounded-lg border border-border-default bg-surface"
						>
							<div className="aspect-video bg-surface-hover">
								{/* 동적 blob/본문 URL을 그대로 미리보기 위한 UI 전용 이미지입니다. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={getImageUrl(previewUrl)} alt="게시글 대표 이미지 미리보기" className="size-full object-cover" />
							</div>
							<figcaption className="px-4 py-4">
								<p className="line-clamp-2 text-body-3 font-semibold wrap-break-word text-text-primary">{postTitle}</p>
							</figcaption>
						</figure>
					</section>

					<div className="space-y-8">
						<fieldset disabled={isPublishing}>
							<legend className="text-label-2 font-semibold text-text-primary">카테고리</legend>
							<div className="mt-4 grid grid-cols-2 gap-3">
								{POST_CATEGORY_OPTIONS.map(({ value, label }) => (
									<label
										key={value}
										className={`flex min-h-11 items-center justify-center rounded-lg border px-4 text-label-2 font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-focus-ring ${settings.category === value ? 'border-brand-primary bg-brand-primary text-on-brand-primary' : 'border-border-default bg-surface text-text-secondary hover:bg-surface-hover'}`}
									>
										<input
											type="radio"
											name="post-category"
											value={value}
											checked={settings.category === value}
											className="sr-only"
											onChange={() => onCategoryChange(value)}
										/>
										{label}
									</label>
								))}
							</div>
						</fieldset>

						<div>
							<label htmlFor="post-colog" className="text-label-2 font-semibold text-text-primary">
								Co-log
							</label>
							<select
								ref={cologSelectRef}
								id="post-colog"
								value={settings.blog?.id ?? ''}
								disabled={isPublishing}
								aria-invalid={cologError !== undefined}
								aria-describedby={cologError === undefined ? undefined : cologErrorId}
								className="mt-4 h-11 w-full rounded-lg border border-border-default bg-surface px-3 text-body-1 text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
								onChange={(event) => {
									const selectedValue = event.currentTarget.value;
									const selectedBlog = cologOptions.find((option) => option.id === Number(selectedValue));
									onCoLogChange(selectedBlog ?? null);
								}}
							>
								<option value="">Co-log를 선택하세요</option>
								{cologOptions.map((option) => (
									<option key={option.id} value={option.id}>
										{option.name}
									</option>
								))}
							</select>
							{cologError !== undefined && (
								<p id={cologErrorId} className="mt-2 text-body-1 text-danger-text" role="alert">
									{cologError}
								</p>
							)}
						</div>

						{publishError !== undefined && (
							<div
								className="rounded-lg border border-danger-border bg-danger-soft p-3 text-body-1 text-danger-text"
								role="alert"
							>
								{publishError}
							</div>
						)}
					</div>
				</div>
			</form>
		</Modal>
	);
}
