'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';

interface UsePostWriteLeaveGuardOptions {
	isDirty: boolean;
	markClean: () => void;
	navigate?: (href: string) => void;
}

export function usePostWriteLeaveGuard({ isDirty, markClean, navigate }: UsePostWriteLeaveGuardOptions) {
	const router = useRouter();
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

	const replaceNavigation = useCallback(
		(href: string) => {
			if (navigate !== undefined) {
				navigate(href);
				return;
			}

			router.replace(href);
		},
		[navigate, router],
	);

	const handleNavigationAttempt = useCallback(() => {
		setIsLeaveModalOpen(true);
	}, []);

	const { cancelPendingNavigation, continuePendingNavigation, clearGuardEntry } = useUnsavedChangesGuard({
		isDirty,
		onNavigationAttempt: handleNavigationAttempt,
		onReplace: replaceNavigation,
	});

	const cancelLeave = useCallback(() => {
		cancelPendingNavigation();
		setIsLeaveModalOpen(false);
	}, [cancelPendingNavigation]);

	const confirmLeave = useCallback(() => {
		setIsLeaveModalOpen(false);
		markClean();
		void continuePendingNavigation();
	}, [continuePendingNavigation, markClean]);

	const navigateAfterCompletion = useCallback(
		(href: string) => {
			clearGuardEntry();
			markClean();
			replaceNavigation(href);
		},
		[clearGuardEntry, markClean, replaceNavigation],
	);

	return {
		isLeaveModalOpen,
		cancelLeave,
		confirmLeave,
		navigateAfterCompletion,
	};
}
