'use client';

import { useCallback, useState } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';

import CologDangerZoneSection from '@/features/colog-danger-zone/ui/CologDangerZoneSection';
import CologMemberManagementSection from '@/features/colog-member-management/ui/CologMemberManagementSection';
import CologProfileSection from '@/features/colog-profile-management/ui/CologProfileSection';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

import { useSettingsLeaveGuard } from '../hooks/use-settings-leave-guard';

export default function CologSettingsWorkspace() {
	const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
	const commitTabChange = useCallback((nextTab: SettingsTab) => setActiveTab(nextTab), []);
	const { isLeaveModalOpen, onDirtyChange, onTabChangeRequest, onLeaveCancel, onLeaveConfirm } = useSettingsLeaveGuard({
		activeTab,
		onTabChange: commitTabChange,
	});

	return (
		<>
			<div id={`settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`settings-tab-${activeTab}`}>
				{activeTab === 'profile' && (
					<CologProfileSection onDirtyChange={onDirtyChange} onTabChangeRequest={onTabChangeRequest} />
				)}
				{activeTab === 'members' && (
					<CologMemberManagementSection onDirtyChange={onDirtyChange} onTabChangeRequest={onTabChangeRequest} />
				)}
				{activeTab === 'danger' && <CologDangerZoneSection onTabChangeRequest={onTabChangeRequest} />}
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
		</>
	);
}
