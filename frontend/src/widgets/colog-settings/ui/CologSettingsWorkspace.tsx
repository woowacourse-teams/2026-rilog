'use client';

import { useCallback, useRef, useState } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';

import CologDangerZoneSection from '@/features/colog-danger-zone/ui/CologDangerZoneSection';
import CologMemberManagementSection from '@/features/colog-member-management/ui/CologMemberManagementSection';
import CologProfileSection from '@/features/colog-profile-management/ui/CologProfileSection';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import PageShell from '@/shared/ui/page-shell/PageShell';

import { useSettingsLeaveGuard } from '../hooks/use-settings-leave-guard';

import CologSettingsHeader from './CologSettingsHeader';

interface CologMemberActions {
	startEditing: () => void;
	cancelEditing: () => void;
	openInvite: () => void;
}

interface CologSettingsWorkspaceProps {
	slug?: string;
}

export default function CologSettingsWorkspace({ slug }: CologSettingsWorkspaceProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
	const [isProfileDirty, setIsProfileDirty] = useState(false);
	const [isMemberEditing, setIsMemberEditing] = useState(false);
	const [hasMemberDraft, setHasMemberDraft] = useState(false);
	const memberActionsRef = useRef<CologMemberActions | null>(null);

	const commitTabChange = useCallback((nextTab: SettingsTab) => setActiveTab(nextTab), []);
	const { isLeaveModalOpen, onDirtyChange, onTabChangeRequest, onLeaveCancel, onLeaveConfirm } = useSettingsLeaveGuard({
		activeTab,
		onTabChange: commitTabChange,
	});
	const handleProfileDirtyChange = useCallback(
		(isDirty: boolean) => {
			setIsProfileDirty(isDirty);
			onDirtyChange(isDirty);
		},
		[onDirtyChange],
	);

	return (
		<PageShell
			isHeaderSticky
			header={
				<CologSettingsHeader
					slug={slug}
					activeTab={activeTab}
					isProfileDirty={isProfileDirty}
					isMemberEditing={isMemberEditing}
					hasMemberDraft={hasMemberDraft}
					onTabChangeRequest={onTabChangeRequest}
					onMemberEdit={() => memberActionsRef.current?.startEditing()}
					onMemberCancel={() => memberActionsRef.current?.cancelEditing()}
					onMemberInvite={() => memberActionsRef.current?.openInvite()}
				/>
			}
		>
			<div
				id={`settings-panel-${activeTab}`}
				role="tabpanel"
				aria-labelledby={`settings-tab-${activeTab}`}
				className="px-6 sm:px-8 lg:px-0"
			>
				{activeTab === 'profile' && (
					<CologProfileSection onDirtyChange={handleProfileDirtyChange} showHeading={false} />
				)}
				{activeTab === 'members' && (
					<CologMemberManagementSection
						onDirtyChange={onDirtyChange}
						actionsRef={memberActionsRef}
						onEditingChange={setIsMemberEditing}
						onDraftChange={setHasMemberDraft}
						showHeading={false}
					/>
				)}
				{activeTab === 'danger' && <CologDangerZoneSection showHeading={false} />}
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
