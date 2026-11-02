'use client';

import { useRef, useState } from 'react';

import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react';

const SWIPE_THRESHOLD_PX = 40;
const PAN_INTENT_THRESHOLD_PX = 2;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface Point {
	x: number;
	y: number;
}

interface PinchStartState {
	distance: number;
	scale: number;
	midpoint: Point;
	offset: Point;
}

interface PanStartState {
	point: Point;
	offset: Point;
}

interface UsePostImageLightboxGesturesParams {
	open: boolean;
	displayedIndex: number;
	totalCount: number;
	onClose: () => void;
	onChangeIndex?: (nextIndex: number) => void;
}

const clampScale = (value: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

const getTouchDistance = (
	first: { clientX: number; clientY: number },
	second: { clientX: number; clientY: number },
): number => Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

const getTouchMidpoint = (
	first: { clientX: number; clientY: number },
	second: { clientX: number; clientY: number },
): Point => ({
	x: (first.clientX + second.clientX) / 2,
	y: (first.clientY + second.clientY) / 2,
});

export const usePostImageLightboxGestures = ({
	open,
	displayedIndex,
	totalCount,
	onClose,
	onChangeIndex,
}: UsePostImageLightboxGesturesParams) => {
	const [scale, setScale] = useState(MIN_SCALE);
	const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
	const [activeIndex, setActiveIndex] = useState(displayedIndex);

	const swipeStartRef = useRef<Point | null>(null);
	const pinchStartRef = useRef<PinchStartState | null>(null);
	const panStartRef = useRef<PanStartState | null>(null);
	const didGestureRef = useRef(false);

	if (activeIndex !== displayedIndex || (!open && (scale !== MIN_SCALE || offset.x !== 0 || offset.y !== 0))) {
		setActiveIndex(displayedIndex);
		setScale(MIN_SCALE);
		setOffset({ x: 0, y: 0 });
	}

	const finishSwipe = (endX: number, endY: number) => {
		const start = swipeStartRef.current;
		swipeStartRef.current = null;
		if (start === null || scale > MIN_SCALE || totalCount === 0 || onChangeIndex === undefined) {
			return;
		}

		const deltaX = endX - start.x;
		const deltaY = endY - start.y;
		if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) {
			return;
		}

		didGestureRef.current = true;
		if (deltaX < 0 && displayedIndex < totalCount - 1) {
			onChangeIndex(displayedIndex + 1);
		} else if (deltaX > 0 && displayedIndex > 0) {
			onChangeIndex(displayedIndex - 1);
		}
	};

	const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
		if (event.touches.length >= 2) {
			const first = event.touches[0];
			const second = event.touches[1];
			if (first === undefined || second === undefined) {
				return;
			}

			const distance = getTouchDistance(first, second);
			if (distance <= 0) {
				return;
			}

			swipeStartRef.current = null;
			panStartRef.current = null;
			didGestureRef.current = true;
			pinchStartRef.current = {
				distance,
				scale,
				midpoint: getTouchMidpoint(first, second),
				offset,
			};
			return;
		}

		const touch = event.touches[0];
		if (touch === undefined) {
			return;
		}

		didGestureRef.current = false;
		pinchStartRef.current = null;

		if (scale > MIN_SCALE) {
			swipeStartRef.current = null;
			panStartRef.current = {
				point: { x: touch.clientX, y: touch.clientY },
				offset,
			};
			return;
		}

		panStartRef.current = null;
		swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
	};

	const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
		if (event.touches.length >= 2) {
			const first = event.touches[0];
			const second = event.touches[1];
			if (first === undefined || second === undefined) {
				return;
			}

			const currentDistance = getTouchDistance(first, second);
			if (currentDistance <= 0) {
				return;
			}

			const currentMidpoint = getTouchMidpoint(first, second);
			const pinchStart =
				pinchStartRef.current ??
				(pinchStartRef.current = {
					distance: currentDistance,
					scale,
					midpoint: currentMidpoint,
					offset,
				});

			didGestureRef.current = true;
			const nextScale = clampScale(pinchStart.scale * (currentDistance / pinchStart.distance));
			setScale(nextScale);

			if (nextScale <= MIN_SCALE) {
				setOffset({ x: 0, y: 0 });
				return;
			}

			setOffset({
				x: pinchStart.offset.x + (currentMidpoint.x - pinchStart.midpoint.x),
				y: pinchStart.offset.y + (currentMidpoint.y - pinchStart.midpoint.y),
			});
			return;
		}

		const touch = event.touches[0];
		if (touch === undefined || scale <= MIN_SCALE) {
			return;
		}

		const panStart =
			panStartRef.current ??
			(panStartRef.current = {
				point: { x: touch.clientX, y: touch.clientY },
				offset,
			});

		const deltaX = touch.clientX - panStart.point.x;
		const deltaY = touch.clientY - panStart.point.y;
		if (Math.abs(deltaX) > PAN_INTENT_THRESHOLD_PX || Math.abs(deltaY) > PAN_INTENT_THRESHOLD_PX) {
			didGestureRef.current = true;
		}

		setOffset({
			x: panStart.offset.x + deltaX,
			y: panStart.offset.y + deltaY,
		});
	};

	const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
		if (event.touches.length === 1) {
			const remainingTouch = event.touches[0];
			if (remainingTouch !== undefined && scale > MIN_SCALE) {
				panStartRef.current = {
					point: { x: remainingTouch.clientX, y: remainingTouch.clientY },
					offset,
				};
			}
			return;
		}

		if (event.touches.length > 1) {
			return;
		}

		const wasPinching = pinchStartRef.current !== null;
		pinchStartRef.current = null;
		panStartRef.current = null;

		if (wasPinching || scale > MIN_SCALE) {
			swipeStartRef.current = null;
			return;
		}

		const touch = event.changedTouches[0];
		if (touch === undefined) {
			swipeStartRef.current = null;
			return;
		}

		finishSwipe(touch.clientX, touch.clientY);
	};

	const handleTouchCancel = () => {
		swipeStartRef.current = null;
		pinchStartRef.current = null;
		panStartRef.current = null;
	};

	const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.pointerType === 'touch') {
			return;
		}
		didGestureRef.current = false;
		swipeStartRef.current = { x: event.clientX, y: event.clientY };
	};

	const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.pointerType === 'touch') {
			return;
		}
		finishSwipe(event.clientX, event.clientY);
	};

	const handleContainerClick = () => {
		if (didGestureRef.current) {
			didGestureRef.current = false;
			return;
		}
		onClose();
	};

	return {
		isZoomed: scale > MIN_SCALE,
		imageStyle:
			scale > MIN_SCALE || offset.x !== 0 || offset.y !== 0
				? { transform: `translate3d(${offset.x}px, ${offset.y}px, 0px) scale(${scale})` }
				: undefined,
		stageGestureProps: {
			onTouchStart: handleTouchStart,
			onTouchMove: handleTouchMove,
			onTouchEnd: handleTouchEnd,
			onTouchCancel: handleTouchCancel,
			onPointerDown: handlePointerDown,
			onPointerUp: handlePointerUp,
			onClick: handleContainerClick,
		},
	};
};
