'use client';

import { useId, useRef } from 'react';

import type { ReactNode } from 'react';

import Button from '@/shared/ui/button/Button';

import BaseModal from './BaseModal';
import { COMPACT_MODAL_CLASS_NAME, COMPACT_MODAL_CONTENT_CLASS_NAME } from './modal.styles';

interface ConfirmModalProps {
	open: boolean;
	title: ReactNode;
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: 'default' | 'danger';
	isPending?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmModal({
	open,
	title,
	description,
	confirmLabel = '확인',
	cancelLabel = '취소',
	variant = 'default',
	isPending = false,
	onConfirm,
	onCancel,
}: ConfirmModalProps) {
	const titleId = useId();
	const descriptionId = useId();
	const cancelButtonRef = useRef<HTMLButtonElement>(null);
	const confirmButtonRef = useRef<HTMLButtonElement>(null);
	const hasDescription = description != null;

	return (
		<BaseModal
			open={open}
			onDismiss={onCancel}
			accessibility={{
				labelledBy: titleId,
				describedBy: hasDescription ? descriptionId : undefined,
			}}
			closeOnBackdrop
			closeOnEscape
			dismissDisabled={isPending}
			initialFocusRef={variant === 'danger' ? cancelButtonRef : confirmButtonRef}
			className={COMPACT_MODAL_CLASS_NAME}
		>
			<div className={`${COMPACT_MODAL_CONTENT_CLASS_NAME} text-left`}>
				<header className="flex-none">
					<h2 id={titleId} className="text-title-2 font-semibold text-text-primary">
						{title}
					</h2>
					{hasDescription && (
						<p id={descriptionId} className="mt-2 text-body-2 whitespace-pre-wrap text-text-secondary">
							{description}
						</p>
					)}
				</header>
				<footer className="mt-8 flex flex-none justify-end gap-3">
					<Button
						ref={cancelButtonRef}
						variant="secondary"
						size="md"
						className="min-w-modal-action"
						disabled={isPending}
						onClick={onCancel}
					>
						{cancelLabel}
					</Button>
					<Button
						ref={confirmButtonRef}
						variant={variant === 'danger' ? 'danger' : 'primary'}
						size="md"
						className="min-w-modal-action"
						isPending={isPending}
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
				</footer>
			</div>
		</BaseModal>
	);
}
