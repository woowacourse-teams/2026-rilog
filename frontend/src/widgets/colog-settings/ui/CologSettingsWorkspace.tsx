'use client';

import { useCallback, useRef, useState } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';
import type { KeyboardEvent } from 'react';

import CologDangerZoneSection from '@/features/colog-danger-zone/ui/CologDangerZoneSection';
import CologMemberManagementSection from '@/features/colog-member-management/ui/CologMemberManagementSection';
import CologProfileSection from '@/features/colog-profile-management/ui/CologProfileSection';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

import { useSettingsLeaveGuard } from '../hooks/use-settings-leave-guard';
import { getNextTab, SETTINGS_TABS } from '../lib/get-next-tab';

import SettingsTabButton from './SettingsTabButton';

export default function CologSettingsWorkspace() {
	const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
	const tabRefs = useRef<Partial<Record<SettingsTab, HTMLButtonElement | null>>>({});

	const commitTabChange = useCallback((nextTab: SettingsTab) => {
		setActiveTab(nextTab);
		tabRefs.current[nextTab]?.focus();
	}, []);

	const { isLeaveModalOpen, onDirtyChange, onTabChangeRequest, onLeaveCancel, onLeaveConfirm } = useSettingsLeaveGuard({
		activeTab,
		onTabChange: commitTabChange,
	});

	const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: SettingsTab) => {
		const nextTab = getNextTab(currentTab, event.key);

		if (nextTab === null) {
			return;
		}

		event.preventDefault();
		onTabChangeRequest(nextTab);
	};

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-4 sm:px-8 md:px-0">
			<div role="tablist" aria-label="팀 설정" className="flex shrink-0 gap-2">
				{SETTINGS_TABS.map((tab) => {
					const isActive = tab.id === activeTab;

					return (
						<SettingsTabButton
							key={tab.id}
							tab={tab}
							isActive={isActive}
							ref={(element) => {
								tabRefs.current[tab.id] = element;
							}}
							onClick={() => onTabChangeRequest(tab.id)}
							onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
						/>
					);
				})}
			</div>

			<div
				id={`settings-panel-${activeTab}`}
				role="tabpanel"
				aria-labelledby={`settings-tab-${activeTab}`}
				className="min-h-0 flex-1 pt-10"
			>
				{activeTab === 'profile' && <CologProfileSection onDirtyChange={onDirtyChange} />}
				{activeTab === 'members' && <CologMemberManagementSection onDirtyChange={onDirtyChange} />}
				{activeTab === 'danger' && <CologDangerZoneSection />}
			</div>

			<ConfirmModal
				open={isLeaveModalOpen}
				title="변경 사항을 저장하지 않고 이동할까요?"
				description="수정 중인 설정은 저장되지 않습니다."
				confirmLabel="이동"
				cancelLabel="계속 수정"
				variant="danger"
				onConfirm={onLeaveConfirm}
				onCancel={onLeaveCancel}
			/>
		</div>
	);
}
