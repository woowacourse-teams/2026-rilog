'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

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
	const prevButtonRef = useRef<HTMLButtonElement>(null);
	const nextButtonRef = useRef<HTMLButtonElement>(null);
	const changeIndex = useCallback(
		(nextIndex: number) => {
			if (onChangeIndex === undefined) {
				return;
			}

			if (nextIndex === 0 && document.activeElement === prevButtonRef.current) {
				nextButtonRef.current?.focus({ preventScroll: true });
			} else if (nextIndex === totalCount - 1 && document.activeElement === nextButtonRef.current) {
				prevButtonRef.current?.focus({ preventScroll: true });
			}
			onChangeIndex(nextIndex);
		},
		[onChangeIndex, totalCount],
	);

	const { imageStyle, stageGestureProps } = usePostImageLightboxGestures({
		open,
		displayedIndex,
		totalCount,
		onClose,
		onChangeIndex: onChangeIndex === undefined ? undefined : changeIndex,
	});

	useEffect(() => {
		if (!open || onChangeIndex === undefined) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft' && currentIndex > 0) {
				event.preventDefault();
				changeIndex(currentIndex - 1);
			} else if (event.key === 'ArrowRight' && currentIndex < images.length - 1) {
				event.preventDefault();
				changeIndex(currentIndex + 1);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [open, images.length, currentIndex, onChangeIndex, changeIndex]);

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
				className="absolute top-4 right-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-modal-backdrop text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
			>
				<XIcon aria-hidden="true" className="size-5" />
			</button>
			{totalCount > 0 && (
				<p
					aria-live="polite"
					className="absolute top-9 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-modal-backdrop px-3 py-1 text-body-3 text-text-on-dark"
				>
					<span className="sr-only">전체 {totalCount}장 중 </span>
					{displayedIndex + 1} / {totalCount}
				</p>
			)}
			{totalCount > 1 && (
				<div className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
					<button
						ref={prevButtonRef}
						type="button"
						aria-label="이전 이미지"
						disabled={!hasPrev}
						onClick={() => {
							if (hasPrev) {
								changeIndex(displayedIndex - 1);
							}
						}}
						className="inline-flex size-10 items-center justify-center rounded-full bg-modal-backdrop text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-40"
					>
						<ChevronIcon aria-hidden="true" className="size-5 rotate-90" />
					</button>
					<button
						ref={nextButtonRef}
						type="button"
						aria-label="다음 이미지"
						disabled={!hasNext}
						onClick={() => {
							if (hasNext) {
								changeIndex(displayedIndex + 1);
							}
						}}
						className="inline-flex size-10 items-center justify-center rounded-full bg-modal-backdrop text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-40"
					>
						<ChevronIcon aria-hidden="true" className="size-5 -rotate-90" />
					</button>
				</div>
			)}
			{displayedImage !== null && (
				<div
					data-testid="post-image-lightbox-stage"
					className="flex h-full w-full touch-none items-center justify-center overflow-hidden select-none sm:p-4"
					{...stageGestureProps}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={displayedImage.src}
						alt={displayedImage.alt}
						draggable={false}
						style={imageStyle}
						className="max-h-full w-full max-w-full origin-center object-contain sm:w-auto"
						onClick={(event) => event.stopPropagation()}
					/>
				</div>
			)}
		</BaseModal>
	);
}
