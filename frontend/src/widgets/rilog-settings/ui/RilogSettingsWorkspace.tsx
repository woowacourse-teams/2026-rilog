'use client';

import { useCallback, useState } from 'react';

import RilogDangerZoneSection from '@/features/rilog-danger-zone/ui/RilogDangerZoneSection';
import { useRilogProfileManagement } from '@/features/rilog-profile-management/hooks/use-rilog-profile-management';
import { mapRilogProfileSettingsResponse } from '@/features/rilog-profile-management/lib/map-rilog-profile-settings-response';
import type { RilogProfileSettingsValue } from '@/features/rilog-profile-management/model/rilog-profile-settings';
import RilogProfileSection from '@/features/rilog-profile-management/ui/RilogProfileSection';
import { useBlogPublicProfileQuery } from '@/shared/api/blogs/queries/public-profile/use-query';
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
}

interface RilogSettingsWorkspaceContentProps {
	slug: string;
	initialTab: RilogSettingsTab;
	initialProfile: RilogProfileSettingsValue;
}

const TAB_HEADER_CONFIG: Record<RilogSettingsTab, { title: string; description: string }> = {
	profile: { title: '프로필', description: '개인 기본 정보와 소개를 관리합니다.' },
	danger: { title: '위험 영역', description: '되돌릴 수 없는 작업입니다. 진행하기 전에 내용을 확인해 주세요.' },
};

export default function RilogSettingsWorkspace({ slug, initialTab = 'profile' }: RilogSettingsWorkspaceProps) {
	const profileQuery = useBlogPublicProfileQuery({
		slug,
		select: (response) => (response.data === undefined ? undefined : mapRilogProfileSettingsResponse(response.data)),
	});

	if (profileQuery.isPending) {
		return (
			<PageShell>
				<p className="flex min-h-64 items-center justify-center text-body-2 text-text-secondary" role="status">
					개인 프로필을 불러오는 중...
				</p>
			</PageShell>
		);
	}

	if (profileQuery.isError || profileQuery.data === undefined) {
		return (
			<PageShell>
				<div className="flex min-h-64 flex-col items-center justify-center gap-5 text-center" role="alert">
					<p className="text-body-2 text-text-secondary">개인 프로필을 불러오지 못했어요.</p>
					<Button variant="secondary" onClick={() => void profileQuery.refetch()}>
						다시 시도
					</Button>
				</div>
			</PageShell>
		);
	}

	console.log(profileQuery.data);
	return (
		<RilogSettingsWorkspaceContent key={slug} slug={slug} initialTab={initialTab} initialProfile={profileQuery.data} />
	);
}

function RilogSettingsWorkspaceContent({ slug, initialTab, initialProfile }: RilogSettingsWorkspaceContentProps) {
	const [activeTab, setActiveTab] = useState<RilogSettingsTab>(initialTab);
	const profileManagement = useRilogProfileManagement({ initialProfile });
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
				{activeTab === 'danger' && <RilogDangerZoneSection />}
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
