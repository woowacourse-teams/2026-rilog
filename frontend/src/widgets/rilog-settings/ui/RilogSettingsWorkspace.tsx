'use client';

import { useCallback, useState } from 'react';

import RilogDangerZoneSection from '@/features/rilog-danger-zone/ui/RilogDangerZoneSection';
import { useRilogProfileManagement } from '@/features/rilog-profile-management/hooks/use-rilog-profile-management';
import { createMockRilogProfile } from '@/features/rilog-profile-management/lib/mock-rilog-profile';
import RilogProfileSection from '@/features/rilog-profile-management/ui/RilogProfileSection';
import { useSettingsLeaveGuard } from '@/shared/hooks/use-settings-leave-guard';
import { buildRilogSettingsPath, type RilogSettingsTab } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import PageShell from '@/shared/ui/page-shell/PageShell';
import SettingsHeader from '@/shared/ui/settings/SettingsHeader';

import { RILOG_SETTINGS_TABS } from '../lib/rilog-settings-tabs';

interface RilogSettingsWorkspaceProps {
	slug: string;
	initialTab?: RilogSettingsTab;
	onWithdraw?: () => void;
}

const TAB_HEADER_CONFIG: Record<RilogSettingsTab, { title: string; description: string }> = {
	profile: { title: '프로필', description: '개인 기본 정보와 소개를 관리합니다.' },
	danger: { title: '위험 영역', description: '되돌릴 수 없는 작업입니다. 진행하기 전에 내용을 확인해 주세요.' },
};

export default function RilogSettingsWorkspace({
	slug,
	initialTab = 'profile',
	onWithdraw,
}: RilogSettingsWorkspaceProps) {
	const [activeTab, setActiveTab] = useState<RilogSettingsTab>(initialTab);
	const profileManagement = useRilogProfileManagement({ initialProfile: createMockRilogProfile(slug) });
	const isWorkspaceDirty = activeTab === 'profile' && profileManagement.isDirty;

	const commitTabChange = useCallback(
		(nextTab: RilogSettingsTab, path: string) => {
			profileManagement.resetToSavedProfile();
			setActiveTab(nextTab);
			window.history.replaceState(window.history.state, '', path);
		},
		[profileManagement],
	);

	const { isLeaveModalOpen, onTabChangeRequest, onLeaveCancel, onLeaveConfirm } = useSettingsLeaveGuard({
		activeTab,
		isDirty: isWorkspaceDirty,
		buildPath: (nextTab) => buildRilogSettingsPath(slug, nextTab),
		onTabChange: commitTabChange,
	});

	const profileActions =
		activeTab === 'profile' && profileManagement.isDirty ? (
			<Button type="submit" form="rilog-profile-settings-form" size="md" className="w-full sm:w-30">
				변경사항 저장
			</Button>
		) : undefined;

	return (
		<PageShell
			isHeaderSticky
			header={
				<SettingsHeader
					activeTab={activeTab}
					tabs={RILOG_SETTINGS_TABS}
					tabListLabel="개인 설정"
					idPrefix="rilog-settings"
					title={TAB_HEADER_CONFIG[activeTab].title}
					description={TAB_HEADER_CONFIG[activeTab].description}
					actions={profileActions}
					onTabChangeRequest={onTabChangeRequest}
				/>
			}
		>
			<div id={`rilog-settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`rilog-settings-tab-${activeTab}`}>
				{activeTab === 'profile' && <RilogProfileSection management={profileManagement} />}
				{activeTab === 'danger' && <RilogDangerZoneSection onWithdraw={onWithdraw} />}
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
		</PageShell>
	);
}
