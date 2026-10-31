'use client';

import { useEffect, useId, useState } from 'react';

import type { PostLightboxImage } from '../hooks/use-post-image-lightbox';

import ChevronIcon from '@/shared/assets/icons/chevron.svg';
import XIcon from '@/shared/assets/icons/x.svg';
import BaseModal from '@/shared/ui/modal/BaseModal';

import { usePostImageLightboxGestures } from '../hooks/use-post-image-lightbox-gestures';

interface PostImageLightboxProps {
	open: boolean;
	images: readonly PostLightboxImage[];
	currentIndex: number;
	onClose: () => void;
	onChangeIndex?: (nextIndex: number) => void;
}

export default function PostImageLightbox({
	open,
	images,
	currentIndex,
	onClose,
	onChangeIndex,
}: PostImageLightboxProps) {
	const titleId = useId();
	// 닫힘 애니메이션 동안 마지막 인덱스를 유지한다.
	const [lastIndex, setLastIndex] = useState(currentIndex);
	if (open && currentIndex !== lastIndex) {
		setLastIndex(currentIndex);
	}
	const displayedIndex = open ? currentIndex : lastIndex;
	const displayedImage = images[displayedIndex] ?? null;
	const totalCount = images.length;
	const hasPrev = displayedIndex > 0;
	const hasNext = displayedIndex < totalCount - 1;

	const { imageStyle, stageGestureProps } = usePostImageLightboxGestures({
		open,
		displayedIndex,
		totalCount,
		onClose,
		onChangeIndex,
	});

	useEffect(() => {
		if (!open || onChangeIndex === undefined) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft' && currentIndex > 0) {
				event.preventDefault();
				onChangeIndex(currentIndex - 1);
			} else if (event.key === 'ArrowRight' && currentIndex < images.length - 1) {
				event.preventDefault();
				onChangeIndex(currentIndex + 1);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [open, images.length, currentIndex, onChangeIndex]);

	return (
		<BaseModal
			open={open}
			onDismiss={onClose}
			accessibility={{ labelledBy: titleId }}
			className="m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent opacity-0 transition-opacity duration-(--modal-exit-duration) data-[state=open]:opacity-100 data-[state=open]:duration-(--modal-enter-duration)"
		>
			<h2 id={titleId} className="sr-only">
				이미지 확대 보기
			</h2>
			<button
				type="button"
				aria-label="이미지 닫기"
				onClick={onClose}
				className="absolute top-4 right-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/50 text-white"
			>
				<XIcon aria-hidden="true" className="size-5" />
			</button>
			{totalCount > 0 && (
				<p
					aria-live="polite"
					className="absolute top-9 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1 text-body-3 text-white"
				>
					<span className="sr-only">전체 {totalCount}장 중 </span>
					{displayedIndex + 1} / {totalCount}
				</p>
			)}
			{totalCount > 1 && (
				<div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
					<button
						type="button"
						aria-label="이전 이미지"
						disabled={!hasPrev}
						onClick={() => {
							if (hasPrev) {
								onChangeIndex?.(displayedIndex - 1);
							}
						}}
						className="inline-flex size-10 items-center justify-center rounded-full bg-black/50 text-white disabled:pointer-events-none disabled:opacity-40"
					>
						<ChevronIcon aria-hidden="true" className="size-5 rotate-90" />
					</button>
					<button
						type="button"
						aria-label="다음 이미지"
						disabled={!hasNext}
						onClick={() => {
							if (hasNext) {
								onChangeIndex?.(displayedIndex + 1);
							}
						}}
						className="inline-flex size-10 items-center justify-center rounded-full bg-black/50 text-white disabled:pointer-events-none disabled:opacity-40"
					>
						<ChevronIcon aria-hidden="true" className="size-5 -rotate-90" />
					</button>
				</div>
			)}
			{displayedImage !== null && (
				<div
					data-testid="post-image-lightbox-stage"
					className="flex h-full w-full touch-none items-center justify-center overflow-hidden p-4 select-none"
					{...stageGestureProps}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={displayedImage.src}
						alt={displayedImage.alt}
						draggable={false}
						style={imageStyle}
						className="max-h-full max-w-full origin-center object-contain"
						onClick={(event) => event.stopPropagation()}
					/>
				</div>
			)}
		</BaseModal>
	);
}
