'use client';

import { useEffect, useRef, useState } from 'react';

import type { Block } from '@blocknote/core';
import type { ChangeEvent, KeyboardEvent } from 'react';

import type { CologOption } from '@/domains/blog/model/colog';
import { POST_CATEGORY_OPTIONS, type PostCategory } from '@/domains/post/model/post';
import { usePostPublishChapters } from '@/features/post-write/hooks/use-post-publish-chapters';
import type { BlogChapterOption } from '@/features/post-write/lib/map-blog-chapter-response';
import type { PublicationSettings, TargetBlog } from '@/features/post-write/model/post-publication';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';
import Input from '@/shared/ui/input/Input';
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
	userSlug: string | null;
	cologError?: string;
	publishError?: string;
	isPublishing: boolean;
	onClose: () => void;
	onCategoryChange: (category: PostCategory) => void;
	onTargetBlogChange: (targetBlog: TargetBlog | null) => void;
	onImageChange: (file: File | null) => void;
	onPublish: (targetBlogType: BlogOption) => void;
	onCreateChapter?: CreateChapter;
}

type CreateChapter = (name: string) => Promise<BlogChapterOption>;

// 모달 footer의 발행 버튼을 내부 form과 연결하는 ID
const PUBLISH_FORM_ID = 'post-publish-settings-form';

const RILOG = 'RILOG';
const COLOG = 'COLOG';

const BLOG_OPTIONS = [
	{ value: RILOG, label: '개인' },
	{ value: COLOG, label: '코로그' },
] as const;

type BlogOption = (typeof BLOG_OPTIONS)[number]['value'];

let nextMockChapterId = 1;

const createMockChapter: CreateChapter = (name) =>
	Promise.resolve({ value: `mock-chapter-${nextMockChapterId++}`, label: name });

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
	onImageChange,
	onPublish,
	onCreateChapter = createMockChapter,
}: PublishSettingsModalProps) {
	// 블로그 선택
	const [selectedBlog, setSelectedBlog] = useState<BlogOption>(() => settings.blog?.type ?? RILOG);
	// 제출 시 Co-log가 비어 있으면 해당 select로 focus하기 위한 ref
	const cologSelectRef = useRef<HTMLSelectElement>(null);
	const seriesNameInputRef = useRef<HTMLInputElement>(null);
	const [createdPersonalChapterOptions, setCreatedPersonalChapterOptions] = useState<BlogChapterOption[]>([]);
	const [selectedChapterValues, setSelectedChapterValues] = useState<Record<string, string>>({});
	const [isSeriesCreatorOpen, setIsSeriesCreatorOpen] = useState(false);
	const [newSeriesName, setNewSeriesName] = useState('');
	const [seriesCreationError, setSeriesCreationError] = useState<string>();
	const [isCreatingSeries, setIsCreatingSeries] = useState(false);
	// 선택 이미지, 본문 첫 이미지, 기본 이미지 순서로 최종 썸네일 URL 결정
	const previewUrl = resolveRepresentativeImagePreview(selectedImageUrl, bodyBlocks, defaultImageUrl);
	const hasRepresentativeImage = settings.representativeImage !== null || settings.representativeImageUrl !== null;
	const selectedColog = settings.blog?.type === COLOG ? settings.blog : null;
	const isCologSelected = selectedColog !== null;
	const chapterLabel = isCologSelected ? '챕터' : '시리즈';
	const chapterQuerySlug = selectedColog?.slug ?? (selectedBlog === RILOG ? userSlug : null);
	const isChapterQueryEnabled = open && chapterQuerySlug !== null;
	const chaptersQuery = usePostPublishChapters({
		slug: chapterQuerySlug ?? '',
		isEnabled: isChapterQueryEnabled,
	});
	const chapterOptions = [
		...(chapterQuerySlug === null ? [] : (chaptersQuery.data ?? [])),
		...(!isCologSelected ? createdPersonalChapterOptions : []),
	];
	const chapterScopeKey = selectedColog === null ? 'personal-blog' : `colog-${selectedColog.id}`;
	const selectedChapterValue = selectedChapterValues[chapterScopeKey] ?? '';
	const isModalPending = isPublishing || isCreatingSeries;
	const isChapterSelectDisabled =
		isModalPending || !isChapterQueryEnabled || chaptersQuery.isPending || chaptersQuery.isError;
	const chapterStatusMessage = !isChapterQueryEnabled
		? selectedBlog === COLOG
			? '코로그를 선택하면 챕터 목록을 확인할 수 있어요.'
			: '시리즈 목록을 확인할 수 없어요.'
		: chaptersQuery.isPending
			? `${chapterLabel} 목록을 불러오는 중...`
			: chaptersQuery.isError
				? `${chapterLabel} 목록을 불러오지 못했습니다.`
				: chapterOptions.length === 0
					? `등록된 ${chapterLabel}가 없습니다.`
					: undefined;

	useEffect(() => {
		if (isSeriesCreatorOpen) {
			seriesNameInputRef.current?.focus();
		}
	}, [isSeriesCreatorOpen]);

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

	const handleCreateSeries = async () => {
		const seriesName = newSeriesName.trim();

		if (seriesName === '') {
			setSeriesCreationError('시리즈 이름을 입력해 주세요.');
			return;
		}

		setIsCreatingSeries(true);
		setSeriesCreationError(undefined);

		try {
			const createdChapter = await onCreateChapter(seriesName);
			setCreatedPersonalChapterOptions((currentOptions) => [...currentOptions, createdChapter]);
			setSelectedChapterValues((currentValues) => ({
				...currentValues,
				'personal-blog': createdChapter.value,
			}));
			setNewSeriesName('');
			setIsSeriesCreatorOpen(false);
		} catch (error) {
			setSeriesCreationError(error instanceof Error ? error.message : '시리즈 생성에 실패했습니다.');
		} finally {
			setIsCreatingSeries(false);
		}
	};

	const handleSeriesNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
			return;
		}

		event.preventDefault();
		void handleCreateSeries();
	};

	const handleBlogChange = (blog: BlogOption) => {
		setSelectedBlog(blog);

		if (blog === RILOG) {
			onTargetBlogChange(userSlug === null ? null : { type: RILOG, slug: userSlug });
			return;
		}

		onTargetBlogChange(null);

		setSeriesCreationError(undefined);
		setNewSeriesName('');
		setIsSeriesCreatorOpen(false);
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
													const selectedCologOption = cologOptions.find(
														(option) => option.id === Number(selectedValue),
													);
													onTargetBlogChange(
														selectedCologOption === undefined
															? null
															: { type: COLOG, id: selectedCologOption.id, slug: selectedCologOption.slug },
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

						<Field
							label={chapterLabel}
							controlId="post-chapter"
							labelAction={
								!isCologSelected ? (
									<Button
										variant="ghost"
										size="sm"
										aria-label={isSeriesCreatorOpen ? '시리즈 추가 취소' : '새 시리즈 추가'}
										disabled={isModalPending}
										onClick={() => {
											setSeriesCreationError(undefined);

											if (isSeriesCreatorOpen) {
												setNewSeriesName('');
												setIsSeriesCreatorOpen(false);
												return;
											}

											setIsSeriesCreatorOpen(true);
										}}
									>
										<span aria-hidden="true">{isSeriesCreatorOpen ? '취소' : '추가 +'}</span>
									</Button>
								) : undefined
							}
						>
							{({ id }) => (
								<div className="flex flex-col gap-3">
									{!isCologSelected && isSeriesCreatorOpen && (
										<Input
											ref={seriesNameInputRef}
											aria-label="새로운 시리즈 이름"
											placeholder="새로운 시리즈 이름을 입력하세요."
											value={newSeriesName}
											disabled={isModalPending}
											status={seriesCreationError === undefined ? 'default' : 'error'}
											helperText={seriesCreationError}
											onChange={(event) => {
												setNewSeriesName(event.currentTarget.value);
												setSeriesCreationError(undefined);
											}}
											onKeyDown={handleSeriesNameKeyDown}
										/>
									)}
									<select
										id={id}
										value={selectedChapterValue}
										disabled={isChapterSelectDisabled}
										aria-busy={chaptersQuery.isPending || undefined}
										className="native-select"
										onChange={(event) => {
											const selectedValue = event.currentTarget.value;
											setSelectedChapterValues((currentValues) => ({
												...currentValues,
												[chapterScopeKey]: selectedValue,
											}));
										}}
									>
										<option value="">선택 안 함</option>
										{chapterOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
									{chapterStatusMessage !== undefined && (
										<div className="flex items-center justify-between gap-3 text-label-2 text-text-secondary">
											<p role={chaptersQuery.isError ? 'alert' : 'status'}>{chapterStatusMessage}</p>
											{chaptersQuery.isError && (
												<Button
													variant="ghost"
													size="sm"
													disabled={isModalPending}
													onClick={() => void chaptersQuery.refetch()}
												>
													다시 시도
												</Button>
											)}
										</div>
									)}
								</div>
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
