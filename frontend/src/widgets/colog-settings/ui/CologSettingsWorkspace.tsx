'use client';

import { useCallback, useState } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';

import CologDangerZoneSection from '@/features/colog-danger-zone/ui/CologDangerZoneSection';
import CologMemberManagementSection from '@/features/colog-member-management/ui/CologMemberManagementSection';
import { MOCK_COLOG_PROFILE_SETTINGS } from '@/features/colog-profile-management/lib/mock-colog-profile-settings';
import CologProfileSection from '@/features/colog-profile-management/ui/CologProfileSection';
import { buildCologSettingsPath } from '@/shared/routes/app-routes';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

import { useSettingsLeaveGuard } from '../hooks/use-settings-leave-guard';

interface CologSettingsWorkspaceProps {
	slug?: string;
	initialTab?: SettingsTab;
}

export default function CologSettingsWorkspace({
	slug = 'rilog',
	initialTab = 'profile',
}: CologSettingsWorkspaceProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
	const [savedProfile, setSavedProfile] = useState(() => ({ ...MOCK_COLOG_PROFILE_SETTINGS }));
	const commitTabChange = useCallback(
		(nextTab: SettingsTab) => {
			setActiveTab(nextTab);
			window.history.replaceState(window.history.state, '', buildCologSettingsPath(slug, nextTab));
		},
		[slug],
	);
	const { isLeaveModalOpen, onDirtyChange, onTabChangeRequest, onLeaveCancel, onLeaveConfirm } = useSettingsLeaveGuard({
		activeTab,
		onTabChange: commitTabChange,
	});

	return (
		<>
			<div id={`settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`settings-tab-${activeTab}`}>
				{activeTab === 'profile' && (
					<CologProfileSection
						initialProfile={savedProfile}
						onDirtyChange={onDirtyChange}
						onSave={setSavedProfile}
						onTabChangeRequest={onTabChangeRequest}
					/>
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
