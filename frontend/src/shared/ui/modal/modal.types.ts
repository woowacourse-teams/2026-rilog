import type { ReactNode, RefObject } from 'react';

export interface BaseModalAccessibility {
	labelledBy: string;
	describedBy?: string;
	role?: 'alertdialog';
}

export interface BaseModalProps {
	open: boolean;
	children: ReactNode;
	onDismiss: () => void;
	accessibility: BaseModalAccessibility;
	closeOnBackdrop?: boolean;
	closeOnEscape?: boolean;
	initialFocusRef?: RefObject<HTMLElement | null>;
	className?: string;
}

export interface ModalCancelAction {
	label?: string;
	onClick?: () => void;
	disabled?: boolean;
}

interface ModalPrimaryActionBase {
	label: string;
	variant?: 'primary' | 'danger';
	disabled?: boolean;
	isPending?: boolean;
}

export type ModalPrimaryAction = ModalPrimaryActionBase &
	(
		| {
				type?: 'button';
				onClick: () => void;
				form?: never;
		  }
		| {
				type: 'submit';
				form: string;
				onClick?: never;
		  }
	);

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalPadding = 'none' | 'sm' | 'md' | 'lg';
export type ModalScrollMode = 'content' | 'custom';

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

export type ModalProps = ModalCommonProps & ModalActions;

export interface ConfirmModalProps {
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

export interface AlertModalProps {
	open: boolean;
	title: ReactNode;
	description?: ReactNode;
	actionLabel?: string;
	onAction: () => void;
	onClose: () => void;
}
