import type { SettingsTabItem } from './settings-tabs';
import type { ComponentPropsWithRef } from 'react';

interface SettingsTabButtonProps<T extends string> extends Omit<
	ComponentPropsWithRef<'button'>,
	'children' | 'id' | 'role' | 'type'
> {
	tab: SettingsTabItem<T>;
	isActive: boolean;
	idPrefix: string;
}

export default function SettingsTabButton<T extends string>({
	isActive,
	tab,
	idPrefix,
	...buttonProps
}: SettingsTabButtonProps<T>) {
	return (
		<button
			{...buttonProps}
			id={`${idPrefix}-tab-${tab.id}`}
			type="button"
			role="tab"
			aria-selected={isActive}
			aria-controls={`${idPrefix}-panel-${tab.id}`}
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
