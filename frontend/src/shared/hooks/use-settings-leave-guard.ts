import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';

interface UseSettingsLeaveGuardOptions<T extends string> {
	activeTab: T;
	isDirty: boolean;
	buildPath: (nextTab: T) => string;
	onTabChange: (nextTab: T, path: string) => void;
}

interface UseSettingsLeaveGuardResult<T extends string> {
	isLeaveModalOpen: boolean;
	onTabChangeRequest: (nextTab: T) => void;
	onLeaveCancel: () => void;
	onLeaveConfirm: () => void;
}

export const useSettingsLeaveGuard = <T extends string>({
	activeTab,
	isDirty,
	buildPath,
	onTabChange,
}: UseSettingsLeaveGuardOptions<T>): UseSettingsLeaveGuardResult<T> => {
	const router = useRouter();
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
	const [pendingTab, setPendingTab] = useState<T | null>(null);

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

	const commitTabChange = useCallback(
		(nextTab: T) => {
			onTabChange(nextTab, buildPath(nextTab));
		},
		[buildPath, onTabChange],
	);

	const handleTabChangeRequest = useCallback(
		(nextTab: T) => {
			if (nextTab === activeTab) {
				return;
			}

			if (isDirty) {
				setPendingTab(nextTab);
				setIsLeaveModalOpen(true);
				return;
			}

			commitTabChange(nextTab);
		},
		[activeTab, commitTabChange, isDirty],
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
			commitTabChange(nextTab);
			return;
		}

		void continuePendingNavigation();
	}, [clearGuardEntry, commitTabChange, continuePendingNavigation, pendingTab]);

	return {
		isLeaveModalOpen,
		onTabChangeRequest: handleTabChangeRequest,
		onLeaveCancel: handleLeaveCancel,
		onLeaveConfirm: handleLeaveConfirm,
	};
};
