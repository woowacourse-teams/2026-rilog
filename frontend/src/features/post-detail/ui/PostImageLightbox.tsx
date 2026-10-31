'use client';

import { useEffect, useId, useRef, useState } from 'react';

import type { PostLightboxImage } from '../hooks/use-post-image-lightbox';
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react';

import ChevronIcon from '@/shared/assets/icons/chevron.svg';
import XIcon from '@/shared/assets/icons/x.svg';
import BaseModal from '@/shared/ui/modal/BaseModal';

interface PostImageLightboxProps {
	open: boolean;
	images: readonly PostLightboxImage[];
	currentIndex: number;
	onClose: () => void;
	onChangeIndex?: (nextIndex: number) => void;
}

const SWIPE_THRESHOLD_PX = 40;

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

	const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
	const didSwipeRef = useRef(false);

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

	const finishSwipe = (endX: number, endY: number) => {
		const start = swipeStartRef.current;
		swipeStartRef.current = null;
		if (start === null || totalCount === 0 || onChangeIndex === undefined) {
			return;
		}

		const deltaX = endX - start.x;
		const deltaY = endY - start.y;
		if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) {
			return;
		}

		didSwipeRef.current = true;
		if (deltaX < 0 && displayedIndex < totalCount - 1) {
			onChangeIndex(displayedIndex + 1);
		} else if (deltaX > 0 && displayedIndex > 0) {
			onChangeIndex(displayedIndex - 1);
		}
	};

	const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
		const touch = event.touches[0];
		if (touch === undefined) {
			return;
		}
		didSwipeRef.current = false;
		swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
	};

	const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
		const touch = event.changedTouches[0];
		if (touch === undefined) {
			return;
		}
		finishSwipe(touch.clientX, touch.clientY);
	};

	const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.pointerType === 'touch') {
			return;
		}
		didSwipeRef.current = false;
		swipeStartRef.current = { x: event.clientX, y: event.clientY };
	};

	const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.pointerType === 'touch') {
			return;
		}
		finishSwipe(event.clientX, event.clientY);
	};

	const handleContainerClick = () => {
		if (didSwipeRef.current) {
			didSwipeRef.current = false;
			return;
		}
		onClose();
	};

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
					className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-body-3 text-white"
				>
					<span className="sr-only">전체 {totalCount}장 중 </span>
					{displayedIndex + 1} / {totalCount}
				</p>
			)}
			{totalCount > 1 && (
				<>
					<button
						type="button"
						aria-label="이전 이미지"
						disabled={!hasPrev}
						onClick={() => {
							if (hasPrev) {
								onChangeIndex?.(displayedIndex - 1);
							}
						}}
						className="absolute top-1/2 left-4 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:pointer-events-none disabled:opacity-40"
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
						className="absolute top-1/2 right-4 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:pointer-events-none disabled:opacity-40"
					>
						<ChevronIcon aria-hidden="true" className="size-5 -rotate-90" />
					</button>
				</>
			)}
			{displayedImage !== null && (
				<div
					data-testid="post-image-lightbox-stage"
					className="flex h-full w-full touch-pan-y items-center justify-center p-4 select-none"
					onTouchStart={handleTouchStart}
					onTouchEnd={handleTouchEnd}
					onPointerDown={handlePointerDown}
					onPointerUp={handlePointerUp}
					onClick={handleContainerClick}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={displayedImage.src}
						alt={displayedImage.alt}
						draggable={false}
						className="max-h-full max-w-full object-contain"
						onClick={(event) => event.stopPropagation()}
					/>
				</div>
			)}
		</BaseModal>
	);
}
