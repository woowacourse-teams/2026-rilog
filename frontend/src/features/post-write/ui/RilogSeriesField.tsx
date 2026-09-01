'use client';

import { useEffect, useRef, useState } from 'react';

import type { KeyboardEvent } from 'react';

import { usePostPublishChapters } from '@/features/post-write/hooks/use-post-publish-chapters';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { useCreateBlogChapterMutation } from '@/shared/api/blogs/mutations/use-create-blog-chapter-mutation';
import Button from '@/shared/ui/button/Button';
import Field from '@/shared/ui/field/Field';
import Input from '@/shared/ui/input/Input';

interface RilogSeriesFieldProps {
	open: boolean;
	userSlug: string | null;
	selectedChapterId: number | null;
	isDisabled: boolean;
	onChapterChange: (chapterId: number | null) => void;
}

export default function RilogSeriesField({
	open,
	userSlug,
	selectedChapterId,
	isDisabled,
	onChapterChange,
}: RilogSeriesFieldProps) {
	const seriesNameInputRef = useRef<HTMLInputElement>(null);
	const [isCreatorOpen, setIsCreatorOpen] = useState(false);
	const [newSeriesName, setNewSeriesName] = useState('');
	const [seriesNameValidationError, setSeriesNameValidationError] = useState<string>();
	const createChapterMutation = useCreateBlogChapterMutation();
	const isQueryEnabled = open && userSlug !== null;
	const chaptersQuery = usePostPublishChapters({
		slug: userSlug ?? '',
		isEnabled: isQueryEnabled,
	});
	const chapterOptions = isQueryEnabled ? (chaptersQuery.data ?? []) : [];
	const selectedChapterValue = selectedChapterId === null ? '' : String(selectedChapterId);
	const creationError =
		seriesNameValidationError ??
		(createChapterMutation.isError
			? getApiErrorMessage(createChapterMutation.error, '시리즈 생성에 실패했습니다.')
			: undefined);
	const isPending = isDisabled || createChapterMutation.isPending;
	const isSelectDisabled = isPending || !isQueryEnabled || chaptersQuery.isPending || chaptersQuery.isError;
	const statusMessage = !isQueryEnabled
		? '시리즈 목록을 확인할 수 없어요.'
		: chaptersQuery.isPending
			? '시리즈 목록을 불러오는 중...'
			: chaptersQuery.isError
				? '시리즈 목록을 불러오지 못했습니다.'
				: chapterOptions.length === 0
					? '등록된 시리즈가 없습니다.'
					: undefined;

	useEffect(() => {
		if (isCreatorOpen) {
			seriesNameInputRef.current?.focus();
		}
	}, [isCreatorOpen]);

	const resetCreation = () => {
		setSeriesNameValidationError(undefined);
		createChapterMutation.reset();
	};

	const handleCreateSeries = async () => {
		const seriesName = newSeriesName.trim();

		if (seriesName === '') {
			setSeriesNameValidationError('시리즈 이름을 입력해 주세요.');
			return;
		}

		if (userSlug === null) {
			setSeriesNameValidationError('시리즈를 생성할 블로그 정보를 확인할 수 없어요.');
			return;
		}

		try {
			const response = await createChapterMutation.mutateAsync({
				slug: userSlug,
				request: { name: seriesName },
			});
			const createdChapter = response.data;

			if (createdChapter === undefined) {
				setSeriesNameValidationError('생성한 시리즈 정보를 확인할 수 없어요.');
				return;
			}

			onChapterChange(createdChapter.chapterId);
			setNewSeriesName('');
			setIsCreatorOpen(false);
		} catch {
			// mutation의 error 상태를 input helper text로 표시한다.
		}
	};

	const handleSeriesNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
			return;
		}

		event.preventDefault();
		void handleCreateSeries();
	};

	return (
		<Field
			label="시리즈"
			controlId="post-chapter"
			labelAction={
				<Button
					variant="ghost"
					size="sm"
					aria-label={isCreatorOpen ? '시리즈 추가 취소' : '새 시리즈 추가'}
					disabled={isPending}
					onClick={() => {
						resetCreation();

						if (isCreatorOpen) {
							setNewSeriesName('');
							setIsCreatorOpen(false);
							return;
						}

						setIsCreatorOpen(true);
					}}
				>
					<span aria-hidden="true">{isCreatorOpen ? '취소' : '추가 +'}</span>
				</Button>
			}
		>
			{({ id }) => (
				<div className="flex flex-col gap-3">
					{isCreatorOpen && (
						<Input
							ref={seriesNameInputRef}
							aria-label="새로운 시리즈 이름"
							placeholder="새로운 시리즈 이름을 입력하세요."
							value={newSeriesName}
							disabled={isPending}
							status={creationError === undefined ? 'default' : 'error'}
							helperText={creationError}
							onChange={(event) => {
								setNewSeriesName(event.currentTarget.value);
								resetCreation();
							}}
							onKeyDown={handleSeriesNameKeyDown}
						/>
					)}
					<select
						id={id}
						value={selectedChapterValue}
						disabled={isSelectDisabled}
						aria-busy={chaptersQuery.isPending || undefined}
						className="native-select"
						onChange={(event) => {
							const selectedValue = event.currentTarget.value;
							onChapterChange(selectedValue === '' ? null : Number(selectedValue));
						}}
					>
						<option value="">선택 안 함</option>
						{chapterOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					{statusMessage !== undefined && (
						<div className="flex items-center justify-between gap-3 text-label-2 text-text-secondary">
							<p role={chaptersQuery.isError ? 'alert' : 'status'}>{statusMessage}</p>
							{chaptersQuery.isError && (
								<Button variant="ghost" size="sm" disabled={isPending} onClick={() => void chaptersQuery.refetch()}>
									다시 시도
								</Button>
							)}
						</div>
					)}
				</div>
			)}
		</Field>
	);
}
