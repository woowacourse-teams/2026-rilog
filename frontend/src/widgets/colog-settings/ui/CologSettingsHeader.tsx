'use client';

import { useEffect, useRef } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';
import type { KeyboardEvent, ReactNode } from 'react';

import { getNextTab, SETTINGS_TABS } from '../lib/get-next-tab';

import SettingsTabButton from './SettingsTabButton';

interface CologSettingsHeaderProps {
	activeTab: SettingsTab;
	title: ReactNode;
	description: ReactNode;
	actions?: ReactNode;
	onTabChangeRequest?: (nextTab: SettingsTab) => void;
}

export default function CologSettingsHeader({
	activeTab,
	title,
	description,
	actions,
	onTabChangeRequest,
}: CologSettingsHeaderProps) {
	const tabRefs = useRef<Partial<Record<SettingsTab, HTMLButtonElement | null>>>({});
	useEffect(() => {
		tabRefs.current[activeTab]?.focus();
	}, [activeTab]);

	const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: SettingsTab) => {
		const nextTab = getNextTab(currentTab, event.key);
		if (nextTab === null) return;
		event.preventDefault();
		onTabChangeRequest?.(nextTab);
	};

	if (onTabChangeRequest === undefined) {
		return null;
	}

	return (
		<div className="px-6 pt-4 sm:px-8 lg:px-0">
			<div role="tablist" aria-label="팀 설정" className="flex gap-2">
				{SETTINGS_TABS.map((tab) => (
					<SettingsTabButton
						key={tab.id}
						tab={tab}
						isActive={tab.id === activeTab}
						ref={(element) => {
							tabRefs.current[tab.id] = element;
						}}
						onClick={() => onTabChangeRequest?.(tab.id)}
						onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
					/>
				))}
			</div>
			<div className="flex flex-wrap items-end justify-between gap-6 pt-8 pb-6">
				<div>
					<h1 id={`${activeTab}-settings-title`} className="text-heading-3 font-bold text-text-primary">
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
