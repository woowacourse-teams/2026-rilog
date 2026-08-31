'use client';

import { useEffect, useRef } from 'react';

import type { PublicationSettings } from '../model/post-publication';
import type { Block } from '@blocknote/core';
import type { ChangeEvent } from 'react';

import type { CologOption } from '@/domains/blog/model/colog';
import { POST_CATEGORY_OPTIONS, type PostCategory } from '@/domains/post/model/post';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
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

const MOCK_PERSONAL_CHAPTER_OPTIONS = [
	{ value: 'frontend-growth', label: '프론트엔드 성장 기록' },
	{ value: 'project-retrospective', label: '프로젝트 회고' },
	{ value: 'developer-life', label: '개발자 일상' },
];

const MOCK_COLOG_CHAPTER_OPTIONS = [
	{ value: 'planning', label: '기획' },
	{ value: 'development', label: '개발' },
	{ value: 'retrospective', label: '회고' },
];

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
	// 제출 시 Co-log가 비어 있으면 해당 select로 focus하기 위한 ref
	const cologSelectRef = useRef<HTMLSelectElement>(null);
	// 선택 이미지, 본문 첫 이미지, 기본 이미지 순서로 최종 썸네일 URL 결정
	const previewUrl = resolveRepresentativeImagePreview(selectedImageUrl, bodyBlocks, defaultImageUrl);
	const hasRepresentativeImage = settings.representativeImage !== null || settings.representativeImageUrl !== null;
	const chapterLabel = settings.blog === null ? '시리즈' : '챕터';
	const chapterOptions = settings.blog === null ? MOCK_PERSONAL_CHAPTER_OPTIONS : MOCK_COLOG_CHAPTER_OPTIONS;
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
					<section>
						<Field label="대표 이미지" description="직접 선택하지 않으면 본문의 첫 이미지가 대표 이미지로 저장됩니다.">
							{({ id, describedBy }) => (
								<div className={`grid gap-2 ${hasRepresentativeImage ? 'grid-cols-2' : 'grid-cols-1'}`}>
									<ImageUploader
										id={id}
										aria-describedby={describedBy}
										fullWidth
										buttonLabel={hasRepresentativeImage ? '이미지 변경' : '이미지 선택'}
										disabled={isPublishing}
										onChange={resetFileInput}
										onFileChange={onImageChange}
									/>
									{hasRepresentativeImage && (
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
							)}
						</Field>
						<figure
							aria-label="게시글 썸네일 미리보기"
							className="mt-5 overflow-hidden rounded-lg border border-border-default bg-surface"
						>
							<div className="aspect-video bg-thumbnail-background">
								{/* 동적 blob/본문 URL을 그대로 미리보기 위한 UI 전용 이미지입니다. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={getImageUrl(previewUrl)}
									alt="게시글 대표 이미지 미리보기"
									className="size-full object-cover"
								/>
							</div>
							<figcaption className="px-4 py-4">
								<p className="line-clamp-2 text-body-3 font-semibold wrap-break-word text-text-primary">{postTitle}</p>
							</figcaption>
						</figure>
					</section>

					<div className="space-y-8">
						<fieldset disabled={isPublishing}>
							<legend className="text-body-2 font-semibold text-text-primary">카테고리</legend>
							<div className="mt-3 grid grid-cols-2 gap-3">
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

						<Field label="코로그" description="코로그를 선택하지 않으면 개인 블로그로 발행돼요." controlId="post-colog">
							{({ id }) => {
								const errorId = `${id}-error`;

								return (
									<div>
										<select
											ref={cologSelectRef}
											id={id}
											value={settings.blog?.id ?? ''}
											disabled={isPublishing}
											aria-invalid={cologError !== undefined}
											aria-describedby={cologError === undefined ? undefined : errorId}
											className="h-11 w-full rounded-lg border border-border-default bg-surface px-3 text-body-1 text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
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
											<p id={errorId} className="mt-2 text-body-1 text-danger-text" role="alert">
												{cologError}
											</p>
										)}
									</div>
								);
							}}
						</Field>

						<Field label={chapterLabel} controlId="post-chapter">
							{({ id }) => (
								<select
									key={settings.blog?.id ?? 'personal-blog'}
									id={id}
									defaultValue=""
									disabled={isPublishing}
									className="h-11 w-full rounded-lg border border-border-default bg-surface px-3 text-body-1 text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
								>
									<option value="">{chapterLabel}를 선택하세요</option>
									{chapterOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							)}
						</Field>

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
