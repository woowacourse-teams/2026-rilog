import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';

import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';

interface UseSettingsLeaveGuardOptions {
	activeTab: SettingsTab;
	onTabChange: (nextTab: SettingsTab) => void;
}

interface UseSettingsLeaveGuardResult {
	isLeaveModalOpen: boolean;
	onDirtyChange: (tab: SettingsTab, isDirty: boolean) => void;
	onTabChangeRequest: (nextTab: SettingsTab) => void;
	onLeaveCancel: () => void;
	onLeaveConfirm: () => void;
}

export const useSettingsLeaveGuard = ({
	activeTab,
	onTabChange,
}: UseSettingsLeaveGuardOptions): UseSettingsLeaveGuardResult => {
	const router = useRouter();
	const [dirtyTabs, setDirtyTabs] = useState<Partial<Record<SettingsTab, boolean>>>({});
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
	const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
	const isDirty = dirtyTabs[activeTab] ?? false;

	const handleNavigationAttempt = useCallback(() => {
		setPendingTab(null);
		setIsLeaveModalOpen(true);
	}, []);

	const replaceNavigation = useCallback(
		(href: string) => {
			router.replace(href);
		},
		[router],
	);

	const { cancelPendingNavigation, continuePendingNavigation, clearGuardEntry } = useUnsavedChangesGuard({
		isDirty,
		onNavigationAttempt: handleNavigationAttempt,
		onReplace: replaceNavigation,
	});

	useEffect(() => {
		if (!isDirty) {
			clearGuardEntry();
		}
	}, [clearGuardEntry, isDirty]);

	const handleDirtyChange = useCallback((tab: SettingsTab, nextIsDirty: boolean) => {
		setDirtyTabs((currentDirtyTabs) => {
			if ((currentDirtyTabs[tab] ?? false) === nextIsDirty) {
				return currentDirtyTabs;
			}

			return { ...currentDirtyTabs, [tab]: nextIsDirty };
		});
	}, []);

	const handleTabChangeRequest = useCallback(
		(nextTab: SettingsTab) => {
			if (nextTab === activeTab) {
				return;
			}

			if (isDirty) {
				setPendingTab(nextTab);
				setIsLeaveModalOpen(true);
				return;
			}

			onTabChange(nextTab);
		},
		[activeTab, isDirty, onTabChange],
	);

	const handleLeaveCancel = useCallback(() => {
		setPendingTab(null);
		cancelPendingNavigation();
		setIsLeaveModalOpen(false);
	}, [cancelPendingNavigation]);

	const handleLeaveConfirm = useCallback(() => {
		const nextTab = pendingTab;

		setPendingTab(null);
		setIsLeaveModalOpen(false);

		if (nextTab !== null) {
			clearGuardEntry();
			onTabChange(nextTab);
			return;
		}

		void continuePendingNavigation();
	}, [clearGuardEntry, continuePendingNavigation, onTabChange, pendingTab]);

	return {
		isLeaveModalOpen,
		onDirtyChange: handleDirtyChange,
		onTabChangeRequest: handleTabChangeRequest,
		onLeaveCancel: handleLeaveCancel,
		onLeaveConfirm: handleLeaveConfirm,
	};
};
