export interface BaseModalAccessibility {
	labelledBy: string;
	describedBy?: string;
	role?: 'alertdialog';
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
export type ModalPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type ModalScrollMode = 'content' | 'custom';
