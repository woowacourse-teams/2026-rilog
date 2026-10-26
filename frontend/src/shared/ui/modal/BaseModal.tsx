'use client';

import { useCallback, useEffect, useEffectEvent, useRef } from 'react';

import type { BaseModalAccessibility } from './modal.types';
import type { CSSProperties, MouseEvent, ReactNode, RefObject, SyntheticEvent } from 'react';

import { BASE_MODAL_CLASS_NAME } from './modal.styles';

interface BaseModalProps {
	open: boolean;
	children: ReactNode;
	onDismiss: () => void;
	onClosed?: () => void;
	onBackdropClick?: () => void;
	accessibility: BaseModalAccessibility;
	closeOnBackdrop?: boolean;
	closeOnEscape?: boolean;
	dismissDisabled?: boolean;
	initialFocusRef?: RefObject<HTMLElement | null>;
	className?: string;
	style?: CSSProperties;
	historyManaged?: boolean;
	exitDurationMs?: number;
}

const EXIT_DURATION_MS = 120;

export default function BaseModal({
	open,
	children,
	onDismiss,
	onClosed,
	onBackdropClick,
	accessibility,
	closeOnBackdrop = true,
	closeOnEscape = true,
	dismissDisabled = false,
	initialFocusRef,
	className,
	style,
	historyManaged = false,
	exitDurationMs,
}: BaseModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const openerRef = useRef<HTMLElement | null>(null);

	const restoreFocus = useCallback(() => {
		if (openerRef.current?.isConnected) {
			openerRef.current.focus({ preventScroll: true });
		}
	}, []);

	useEffect(() => {
		// React may detach refs before passive cleanup (including Strict Mode replay).
		const dialog = dialogRef.current;
		return () => {
			if (dialog?.open) {
				dialog.close();
				dialog.dataset.state = 'closed';
				restoreFocus();
			}
		};
	}, [restoreFocus]);

	const focusInitialElement = useEffectEvent(() => initialFocusRef?.current?.focus());
	const getExitDuration = useEffectEvent(() => exitDurationMs);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) {
			return;
		}

		let animationFrame: number | undefined;
		let closeTimer: number | undefined;

		const closeDialog = () => {
			if (closeTimer !== undefined) window.clearTimeout(closeTimer);
			if (!dialog.open) return;
			dialog.close();
			dialog.dataset.state = 'closed';
			restoreFocus();
		};

		const handleExitTransitionEnd = (event: TransitionEvent) => {
			if (event.target !== dialog || event.pseudoElement) return;
			if (['translate', 'transform', 'scale', 'opacity'].includes(event.propertyName)) closeDialog();
		};

		if (open) {
			if (!dialog.open) {
				openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
				// Native focusing runs inside showModal, so apply the entry pose before it.
				dialog.dataset.state = 'opening';
				dialog.showModal();
				focusInitialElement();
				animationFrame = window.requestAnimationFrame(() => {
					dialog.dataset.state = 'open';
				});
			} else if (dialog.dataset.state === 'closing') {
				dialog.dataset.state = 'open';
				focusInitialElement();
			}
		} else if (dialog.open) {
			dialog.dataset.state = 'closing';
			dialog.addEventListener('transitionend', handleExitTransitionEnd);
			const isReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
			const duration = getExitDuration();
			// Explicit animation durations get a fallback margin; transitionend normally closes first.
			const delay = isReducedMotion ? 0 : (duration ?? EXIT_DURATION_MS) + (duration === undefined ? 0 : 50);
			closeTimer = window.setTimeout(closeDialog, delay);
		}

		return () => {
			dialog.removeEventListener('transitionend', handleExitTransitionEnd);
			if (animationFrame !== undefined) {
				window.cancelAnimationFrame(animationFrame);
			}
			if (closeTimer !== undefined) {
				window.clearTimeout(closeTimer);
			}
		};
	}, [open, restoreFocus]);

	const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
		if (event.target !== event.currentTarget || event.currentTarget.dataset.state === 'closing') {
			return;
		}

		onBackdropClick?.();
		if (!dismissDisabled && closeOnBackdrop) {
			onDismiss();
		}
	};

	const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
		if (event.target instanceof Element && event.target.closest('dialog') !== event.currentTarget) return;
		event.preventDefault(); //애니메이션 적용을 위해 기본 <dialog> 태그의 action 막기
		if (!dismissDisabled && closeOnEscape && event.currentTarget.dataset.state !== 'closing') {
			onDismiss();
		}
	};

	return (
		<dialog
			ref={dialogRef}
			closedby={historyManaged || !closeOnEscape ? 'none' : undefined}
			role={accessibility.role}
			aria-labelledby={accessibility.labelledBy}
			aria-describedby={accessibility.describedBy}
			style={style}
			className={`${BASE_MODAL_CLASS_NAME} ${className ?? ''}`}
			onClose={(event) => {
				if (event.target === event.currentTarget) onClosed?.();
			}}
			onCancel={handleCancel}
			onKeyDown={
				historyManaged
					? (event) => {
							if (event.key === 'Escape') handleCancel(event);
						}
					: undefined
			}
			onClick={handleBackdropClick}
		>
			{children}
		</dialog>
	);
}
