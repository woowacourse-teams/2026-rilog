'use client';

import { useIsMutating } from '@tanstack/react-query';
import { type ChangeEvent, useRef, useState } from 'react';

import type { Block } from '@blocknote/core';

import { POST_CATEGORY_OPTIONS, type PostCategory } from '@/domains/post/model/post';
import type {
	PostPublishCologOption,
	PublicationSettings,
	TargetBlog,
} from '@/features/post-write/model/post-publication';
import { CREATE_BLOG_CHAPTER_MUTATION_KEY } from '@/shared/api/blogs/mutations/use-create-blog-chapter-mutation';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';
import Modal from '@/shared/ui/modal/Modal';
import { getImageUrl } from '@/shared/utils/get-image-url';

import { resolveRepresentativeImagePreview } from '../lib/resolve-representative-image';

import CologChapterField from './CologChapterField';
import RilogSeriesField from './RilogSeriesField';

interface PublishSettingsModalProps {
	open: boolean;
	postTitle: string;
	settings: PublicationSettings;
	selectedImageUrl: string | null;
	bodyBlocks: Block[];
	defaultImageUrl: string;
	cologOptions: PostPublishCologOption[];
	userSlug: string | null;
	cologError?: string;
	publishError?: string;
	isPublishing: boolean;
	onClose: () => void;
	onCategoryChange: (category: PostCategory) => void;
	onTargetBlogChange: (targetBlog: TargetBlog | null) => void;
	onChapterChange: (chapterId: number | null) => void;
	onImageChange: (file: File | null) => void;
	onPublish: (targetBlogType: BlogOption) => void;
}

// 모달 footer의 발행 버튼을 내부 form과 연결하는 ID
const PUBLISH_FORM_ID = 'post-publish-settings-form';

const RILOG = 'RILOG';
const COLOG = 'COLOG';

const BLOG_OPTIONS = [
	{ value: RILOG, label: '개인' },
	{ value: COLOG, label: '코로그' },
] as const;

type BlogOption = (typeof BLOG_OPTIONS)[number]['value'];

export default function PublishSettingsModal({
	open,
	postTitle,
	settings,
	selectedImageUrl,
	bodyBlocks,
	defaultImageUrl,
	cologOptions,
	userSlug,
	cologError,
	publishError,
	isPublishing,
	onClose,
	onCategoryChange,
	onTargetBlogChange,
	onChapterChange,
	onImageChange,
	onPublish,
}: PublishSettingsModalProps) {
	// 블로그 선택
	const [selectedBlog, setSelectedBlog] = useState<BlogOption>(() => settings.blog?.type ?? RILOG);
	// 제출 시 Co-log가 비어 있으면 해당 select로 focus하기 위한 ref
	const cologSelectRef = useRef<HTMLSelectElement>(null);
	const isCreatingSeries = useIsMutating({ mutationKey: CREATE_BLOG_CHAPTER_MUTATION_KEY }) > 0;
	// 선택 이미지, 본문 첫 이미지, 기본 이미지 순서로 최종 썸네일 URL 결정
	const previewUrl = resolveRepresentativeImagePreview(selectedImageUrl, bodyBlocks, defaultImageUrl);
	const hasRepresentativeImage = settings.representativeImage !== null || settings.representativeImageUrl !== null;
	const selectedColog = settings.blog?.type === COLOG ? settings.blog : null;
	const isRilog = selectedBlog === RILOG;
	const isCologSelected = selectedColog !== null;
	const selectedCologOption = isCologSelected
		? (cologOptions.find((option) => option.id === selectedColog.id) ?? null)
		: null;
	const isModalPending = isPublishing || isCreatingSeries;

	// React form action으로 제출을 처리하고 필수 설정의 focus 처리 후 실제 발행 요청을 부모에 위임
	const handleSubmit = () => {
		if (isCreatingSeries) {
			return;
		}

		if (selectedBlog === COLOG && !isCologSelected) {
			cologSelectRef.current?.focus();
		}

		onPublish(selectedBlog);
	};

	// 공용 ImageUploader가 label과 숨겨진 file input의 연결을 소유하며 같은 파일을 다시 선택할 수 있도록 초기화
	const resetFileInput = (event: ChangeEvent<HTMLInputElement>) => {
		event.currentTarget.value = '';
	};

	const handleBlogChange = (blog: BlogOption) => {
		setSelectedBlog(blog);

		if (blog === RILOG) {
			onTargetBlogChange(userSlug === null ? null : { type: RILOG, slug: userSlug });
			return;
		}

		onTargetBlogChange(null);
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
			isPending={isModalPending}
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
										disabled={isModalPending}
										onChange={resetFileInput}
										onFileChange={onImageChange}
									/>
									{hasRepresentativeImage && (
										<Button
											size="md"
											variant="ghost"
											className="w-full focus-visible:-outline-offset-2"
											disabled={isModalPending}
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
						<Field label="카테고리" controlId="post-category" required>
							{({ id }) => (
								<select
									id={id}
									value={settings.category}
									disabled={isModalPending}
									className="native-select"
									onChange={(event) => {
										const selectedCategory = POST_CATEGORY_OPTIONS.find(
											(option) => option.value === event.currentTarget.value,
										)?.value;

										if (selectedCategory !== undefined) {
											onCategoryChange(selectedCategory);
										}
									}}
								>
									{POST_CATEGORY_OPTIONS.map(({ value, label }) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							)}
						</Field>

						<fieldset disabled={isModalPending}>
							<legend className="text-body-2 font-semibold text-text-primary">
								발행 위치
								<span aria-hidden="true" className="ml-0.5 text-danger">
									*
								</span>
							</legend>
							<div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-border-default bg-surface">
								{BLOG_OPTIONS.map(({ value, label }) => (
									<label
										key={value}
										className={`flex min-h-10 items-center justify-center px-4 text-label-2 font-semibold transition-colors has-focus-visible:z-10 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-focus-ring ${value === BLOG_OPTIONS[0].value ? 'border-r border-border-default' : ''} ${selectedBlog === value ? 'bg-brand-primary text-on-brand-primary' : 'bg-surface text-text-secondary hover:bg-surface-hover active:bg-surface-active'}`}
									>
										<input
											type="radio"
											name="post-blog-type"
											value={value}
											checked={selectedBlog === value}
											className="sr-only"
											onChange={() => handleBlogChange(value)}
										/>
										{label}
									</label>
								))}
							</div>
						</fieldset>

						{selectedBlog === COLOG && (
							<Field label="코로그" controlId="post-colog" required>
								{({ id }) => {
									const errorId = `${id}-error`;

									return (
										<div>
											<select
												ref={cologSelectRef}
												id={id}
												value={settings.blog?.type === COLOG ? settings.blog.id : ''}
												disabled={isModalPending}
												aria-invalid={cologError !== undefined}
												aria-describedby={cologError === undefined ? undefined : errorId}
												className="native-select"
												onChange={(event) => {
													const selectedValue = event.currentTarget.value;
													const nextCologOption = cologOptions.find((option) => option.id === Number(selectedValue));
													onTargetBlogChange(
														nextCologOption === undefined
															? null
															: { type: COLOG, id: nextCologOption.id, slug: nextCologOption.slug },
													);
												}}
											>
												<option value="">선택 안 함</option>
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
						)}

						{isRilog ? (
							<RilogSeriesField
								open={open}
								userSlug={userSlug}
								selectedChapterId={settings.chapterId}
								isDisabled={isModalPending}
								onChapterChange={onChapterChange}
							/>
						) : (
							<CologChapterField
								chapters={selectedCologOption?.chapters ?? null}
								selectedChapterId={settings.chapterId}
								isDisabled={isModalPending}
								onChapterChange={onChapterChange}
							/>
						)}

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
