import type { SettingsTabItem } from '../lib/get-next-tab';
import type { ComponentPropsWithRef } from 'react';

interface SettingsTabButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children' | 'id' | 'role' | 'type'> {
	tab: SettingsTabItem;
	isActive: boolean;
}

export default function SettingsTabButton({ isActive, tab, ...buttonProps }: SettingsTabButtonProps) {
	return (
		<button
			{...buttonProps}
			id={`settings-tab-${tab.id}`}
			type="button"
			role="tab"
			aria-selected={isActive}
			aria-controls={`settings-panel-${tab.id}`}
			tabIndex={isActive ? 0 : -1}
			className={`border-b-2 px-3 pb-3 text-body-1 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring ${
				isActive
					? 'border-brand-primary font-semibold text-text-primary'
					: 'border-transparent text-text-secondary hover:text-text-primary'
			}`}
		>
			{tab.label}
		</button>
	);
}
