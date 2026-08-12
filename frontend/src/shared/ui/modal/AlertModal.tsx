'use client';

import { useId, useRef } from 'react';

import type { AlertModalProps } from './modal.types';

import Button from '@/shared/ui/button/Button';

import BaseModal from './BaseModal';
import { COMPACT_MODAL_CLASS_NAME, COMPACT_MODAL_CONTENT_CLASS_NAME } from './modal.styles';

export default function AlertModal({
	open,
	title,
	description,
	actionLabel = '확인',
	onAction,
	onClose,
}: AlertModalProps) {
	const titleId = useId();
	const descriptionId = useId();
	const actionButtonRef = useRef<HTMLButtonElement>(null);
	const hasDescription = description != null;

	const handleAction = () => {
		onAction();
		onClose();
	};

	return (
		<BaseModal
			open={open}
			onDismiss={onClose}
			accessibility={{
				role: 'alertdialog',
				labelledBy: titleId,
				describedBy: hasDescription ? descriptionId : undefined,
			}}
			closeOnBackdrop
			closeOnEscape
			initialFocusRef={actionButtonRef}
			className={COMPACT_MODAL_CLASS_NAME}
		>
			<div className={COMPACT_MODAL_CONTENT_CLASS_NAME}>
				<header className="flex-none">
					<h2 id={titleId} className="text-title-2 font-semibold text-text-primary">
						{title}
					</h2>
					{hasDescription && (
						<p id={descriptionId} className="mt-2 text-body-2 text-text-secondary">
							{description}
						</p>
					)}
				</header>
				<footer className="mt-8 flex flex-none justify-end">
					<Button ref={actionButtonRef} size="lg" className="min-w-modal-action" onClick={handleAction}>
						{actionLabel}
					</Button>
				</footer>
			</div>
		</BaseModal>
	);
}
