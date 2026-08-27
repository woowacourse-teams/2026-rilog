'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { getNextSettingsTab, type SettingsTabItem } from './settings-tabs';
import SettingsTabButton from './SettingsTabButton';

interface SettingsHeaderProps<T extends string> {
	activeTab: T;
	tabs: readonly SettingsTabItem<T>[];
	tabListLabel: string;
	idPrefix: string;
	title: ReactNode;
	description: ReactNode;
	actions?: ReactNode;
	onTabChangeRequest?: (nextTab: T) => void;
}

export default function SettingsHeader<T extends string>({
	activeTab,
	tabs,
	tabListLabel,
	idPrefix,
	title,
	description,
	actions,
	onTabChangeRequest,
}: SettingsHeaderProps<T>) {
	const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

	useEffect(() => {
		tabRefs.current[activeTab]?.focus();
	}, [activeTab]);

	const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: T) => {
		const nextTab = getNextSettingsTab(tabs, currentTab, event.key);
		if (nextTab === null) return;
		event.preventDefault();
		onTabChangeRequest?.(nextTab);
	};

	if (onTabChangeRequest === undefined) {
		return null;
	}

	return (
		<div className="px-6 pt-4 sm:px-8 lg:px-0">
			<div role="tablist" aria-label={tabListLabel} className="flex gap-2">
				{tabs.map((tab) => (
					<SettingsTabButton
						key={tab.id}
						tab={tab}
						idPrefix={idPrefix}
						isActive={tab.id === activeTab}
						ref={(element) => {
							tabRefs.current[tab.id] = element;
						}}
						onClick={() => onTabChangeRequest(tab.id)}
						onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
					/>
				))}
			</div>
			<div className="flex flex-wrap items-end justify-between gap-6 pt-8 pb-6">
				<div>
					<h1 id={`${idPrefix}-${activeTab}-title`} className="text-heading-3 font-bold text-text-primary">
						{title}
					</h1>
					<p className="mt-0.5 text-body-1 text-text-secondary">{description}</p>
				</div>
				{actions !== undefined && (
					<div className="ml-auto flex w-full shrink-0 justify-end gap-2 sm:w-auto">{actions}</div>
				)}
			</div>
		</div>
	);
}
