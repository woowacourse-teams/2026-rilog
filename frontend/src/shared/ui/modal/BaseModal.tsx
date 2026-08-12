'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { BaseModalProps } from './modal.types';
import type { MouseEvent, SyntheticEvent } from 'react';

const MODAL_CLASS_NAME =
	'm-auto max-h-modal-max-height scale-(--modal-closed-scale) overflow-hidden rounded-modal border-0 bg-surface p-0 text-text-primary opacity-0 shadow-modal transition-[opacity,scale,overlay,display] duration-(--modal-exit-duration) ease-out [transition-behavior:allow-discrete] backdrop:bg-modal-backdrop backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-(--modal-exit-duration) data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=open]:duration-(--modal-enter-duration) data-[state=open]:backdrop:opacity-100 data-[state=open]:backdrop:duration-(--modal-enter-duration) md:max-h-modal-max-height-md';
const EXIT_DURATION_MS = 120;

export default function BaseModal({
	open,
	children,
	onDismiss,
	accessibility,
	closeOnBackdrop = true,
	closeOnEscape = true,
	initialFocusRef,
	className,
}: BaseModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const isDialogOpenRef = useRef(false);

	const restoreFocus = useCallback(() => {
		if (openerRef.current?.isConnected) {
			openerRef.current.focus();
		}
	}, []);

	useEffect(
		() => () => {
			const dialog = dialogRef.current;
			if (isDialogOpenRef.current) {
				if (dialog?.open) {
					dialog.close();
					dialog.dataset.state = 'closed';
				}
				isDialogOpenRef.current = false;
				restoreFocus();
			}
		},
		[restoreFocus],
	);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) {
			return;
		}

		let animationFrame: number | undefined;
		let closeTimer: number | undefined;

		const closeDialog = () => {
			if (dialog.open) {
				dialog.close();
			}
			isDialogOpenRef.current = false;
			dialog.dataset.state = 'closed';
			restoreFocus();
		};

		if (open) {
			if (!dialog.open) {
				openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
				dialog.showModal();
				isDialogOpenRef.current = true;
			}

			dialog.dataset.state = 'opening';
			initialFocusRef?.current?.focus();
			animationFrame = window.requestAnimationFrame(() => {
				dialog.dataset.state = 'open';
			});
		} else if (dialog.open) {
			dialog.dataset.state = 'closing';
			closeTimer = window.setTimeout(closeDialog, EXIT_DURATION_MS);
		}

		return () => {
			if (animationFrame !== undefined) {
				window.cancelAnimationFrame(animationFrame);
			}
			if (closeTimer !== undefined) {
				window.clearTimeout(closeTimer);
			}
		};
	}, [initialFocusRef, open, restoreFocus]);

	const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
		if (closeOnBackdrop && event.target === event.currentTarget && event.currentTarget.dataset.state !== 'closing') {
			onDismiss();
		}
	};

	const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
		event.preventDefault(); //애니메이션 적용을 위해 기본 <dialog> 태그의 action 막기
		if (closeOnEscape && event.currentTarget.dataset.state !== 'closing') {
			onDismiss();
		}
	};

	return (
		<dialog
			ref={dialogRef}
			role={accessibility.role}
			aria-labelledby={accessibility.labelledBy}
			aria-describedby={accessibility.describedBy}
			className={`${MODAL_CLASS_NAME} ${className ?? ''}`}
			onCancel={handleCancel}
			onClick={handleBackdropClick}
		>
			{children}
		</dialog>
	);
}
