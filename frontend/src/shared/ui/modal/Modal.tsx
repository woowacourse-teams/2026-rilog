'use client';

import { useId } from 'react';

import type { ModalCancelAction, ModalPadding, ModalPrimaryAction, ModalScrollMode, ModalSize } from './modal.types';
import type { ReactNode, RefObject } from 'react';

import XIcon from '@/shared/assets/icons/x.svg';
import Button from '@/shared/ui/button/Button';

import BaseModal from './BaseModal';
import { CENTERED_MODAL_CLASS_NAME } from './modal.styles';

interface ModalCommonProps {
	open: boolean;
	title: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
	onClose: () => void;
	size?: ModalSize;
	padding?: ModalPadding;
	scrollMode?: ModalScrollMode;
	showCloseButton?: boolean;
	closeButtonLabel?: string;
	closeOnBackdrop?: boolean;
	closeOnEscape?: boolean;
	isPending?: boolean;
	initialFocusRef?: RefObject<HTMLElement | null>;
}

type ModalActions =
	| {
			footer?: never;
			cancelAction?: ModalCancelAction;
			primaryAction?: ModalPrimaryAction;
	  }
	| {
			footer: ReactNode;
			cancelAction?: never;
			primaryAction?: never;
	  };

type ModalProps = ModalCommonProps & ModalActions;

const SIZE_CLASS_NAMES: Record<ModalSize, string> = {
	sm: 'max-w-modal-sm',
	md: 'max-w-modal-md',
	lg: 'max-w-modal-lg',
	xl: 'max-w-modal-xl',
	full: 'h-modal-max-height max-w-modal-full md:h-modal-max-height-md',
};

const PADDING_CLASS_NAMES: Record<ModalPadding, string> = {
	none: 'p-0',
	sm: 'p-4',
	md: 'p-6',
	lg: 'p-8',
	xl: 'p-8 md:p-10',
};

const SCROLL_CLASS_NAMES: Record<ModalScrollMode, string> = {
	content: '-mx-1 overflow-y-auto px-1',
	custom: 'overflow-hidden',
};

export default function Modal({
	open,
	title,
	description,
	children,
	onClose,
	size = 'md',
	padding = 'lg',
	scrollMode = 'content',
	showCloseButton = true,
	closeButtonLabel = '모달 닫기',
	closeOnBackdrop = true,
	closeOnEscape = true,
	isPending = false,
	initialFocusRef,
	footer,
	cancelAction,
	primaryAction,
}: ModalProps) {
	const titleId = useId();
	const descriptionId = useId();
	const hasDescription = description != null;
	const hasContent = children != null;
	const hasFooter = footer != null || cancelAction != null || primaryAction != null;
	const primaryVariant = primaryAction?.variant ?? 'primary';
	const handleCancelClick = () => {
		cancelAction?.onClick?.();
		onClose();
	};

	return (
		<BaseModal
			open={open}
			onDismiss={onClose}
			accessibility={{
				labelledBy: titleId,
				describedBy: hasDescription ? descriptionId : undefined,
			}}
			closeOnBackdrop={closeOnBackdrop}
			closeOnEscape={closeOnEscape}
			dismissDisabled={isPending}
			initialFocusRef={initialFocusRef}
			className={`${CENTERED_MODAL_CLASS_NAME} w-modal-viewport md:w-modal-viewport-md ${SIZE_CLASS_NAMES[size]}`}
		>
			<div
				className={`flex max-h-[inherit] min-h-0 flex-col overflow-hidden ${size === 'full' ? 'h-full' : ''} ${PADDING_CLASS_NAMES[padding]}`}
			>
				<header className="relative flex-none">
					{showCloseButton && (
						<Button
							variant="ghost"
							size="icon"
							className="absolute top-0 right-0 focus-visible:-outline-offset-2"
							aria-label={closeButtonLabel}
							disabled={isPending}
							onClick={onClose}
						>
							<XIcon aria-hidden="true" className="size-5" />
						</Button>
					)}
					<div className={`min-w-0`}>
						<h2
							id={titleId}
							className={`text-title-2 font-semibold text-text-primary ${showCloseButton ? 'pr-12' : ''}`}
						>
							{title}
						</h2>
						{hasDescription && (
							<p id={descriptionId} className="mt-2 text-body-2 whitespace-pre-wrap text-text-secondary">
								{description}
							</p>
						)}
					</div>
				</header>

				{hasContent && <div className={`mt-6 min-h-0 flex-1 ${SCROLL_CLASS_NAMES[scrollMode]}`}>{children}</div>}

				{hasFooter && (
					<footer className="mt-6 flex flex-none justify-end gap-3">
						{footer ?? (
							<>
								{cancelAction !== undefined && (
									<Button
										variant="secondary"
										size="md"
										className="min-w-modal-action focus-visible:-outline-offset-2"
										disabled={cancelAction.disabled || isPending}
										onClick={handleCancelClick}
									>
										{cancelAction.label ?? '취소'}
									</Button>
								)}
								{primaryAction !== undefined && (
									<Button
										type={primaryAction.type ?? 'button'}
										form={primaryAction.type === 'submit' ? primaryAction.form : undefined}
										variant={primaryVariant}
										size="md"
										className="min-w-modal-action focus-visible:-outline-offset-2"
										disabled={primaryAction.disabled}
										isPending={isPending}
										onClick={primaryAction.type === 'submit' ? undefined : primaryAction.onClick}
									>
										{primaryAction.label}
									</Button>
								)}
							</>
						)}
					</footer>
				)}
			</div>
		</BaseModal>
	);
}
