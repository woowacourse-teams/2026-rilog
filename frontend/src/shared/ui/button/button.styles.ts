export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'github' | 'ghost';

interface ButtonStyleOptions {
	className?: string;
	fullWidth?: boolean;
	size: ButtonSize;
	variant: ButtonVariant;
}

const BASE_BUTTON_CLASS_NAME =
	'inline-flex items-center justify-center gap-2 text-label-2 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-btn-disabled';

const SIZE_CLASS_NAMES: Record<ButtonSize, string> = {
	sm: 'h-btn-height-sm rounded-md px-btn-inline-sm',
	md: 'h-btn-height-md rounded-md px-btn-inline-md',
	lg: 'h-btn-height-lg rounded-lg px-btn-inline-lg',
	icon: 'size-10 shrink-0 rounded-lg',
};

const VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
	primary: 'bg-btn-primary text-btn-primary-foreground hover:bg-btn-primary-hover active:bg-btn-primary-active',
	secondary:
		'border border-btn-cancel-border bg-btn-cancel text-btn-cancel-foreground hover:bg-btn-cancel-hover active:bg-btn-cancel-active',
	danger: 'bg-btn-delete text-btn-delete-foreground hover:bg-btn-delete-hover active:bg-btn-delete-active',
	success: 'bg-btn-approve text-btn-approve-foreground hover:bg-btn-approve-hover active:bg-btn-approve-active',
	github: 'bg-btn-github text-btn-github-foreground hover:bg-btn-github-hover active:bg-btn-github-active',
	ghost: 'text-text-secondary hover:bg-surface-hover active:bg-surface-active',
};

export function getButtonClassName({ className, fullWidth = false, size, variant }: ButtonStyleOptions) {
	return `${BASE_BUTTON_CLASS_NAME} ${SIZE_CLASS_NAMES[size]} ${VARIANT_CLASS_NAMES[variant]} ${fullWidth ? 'w-full!' : ''} ${className ?? ''}`.trim();
}
