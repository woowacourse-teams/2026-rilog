'use client';

import { useCallback, useState } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';
import type { FormEvent } from 'react';

import CologDangerZoneSection from '@/features/colog-danger-zone/ui/CologDangerZoneSection';
import { useCologMemberDrafts } from '@/features/colog-member-management/hooks/use-colog-member-drafts';
import CologMemberManagementSection from '@/features/colog-member-management/ui/CologMemberManagementSection';
import { useCologProfileForm } from '@/features/colog-profile-management/hooks/use-colog-profile-form';
import { MOCK_COLOG_PROFILE_SETTINGS } from '@/features/colog-profile-management/lib/mock-colog-profile-settings';
import { isCologProfileSettingsEqual } from '@/features/colog-profile-management/lib/validate-colog-profile-settings';
import CologProfileSection from '@/features/colog-profile-management/ui/CologProfileSection';
import { buildCologSettingsPath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import PageShell from '@/shared/ui/page-shell/PageShell';

import { useSettingsLeaveGuard } from '../hooks/use-settings-leave-guard';

import CologSettingsHeader from './CologSettingsHeader';
import type { CologMember } from '@/domains/blog/model/colog';
interface CologSettingsWorkspaceProps {
	slug?: string;
	initialTab?: SettingsTab;
	initialMembers?: CologMember[];
}

const TAB_HEADER_CONFIG: Record<SettingsTab, { title: string; description: string }> = {
	profile: {
		title: '프로필',
		description: '팀의 기본 정보와 소개를 관리합니다.',
	},
	members: {
		title: '멤버 관리',
		description: '팀 멤버의 프로필, 역할, 권한을 관리합니다.',
	},
	danger: {
		title: '위험 영역',
		description: '되돌릴 수 없는 작업입니다. 진행하기 전에 내용을 확인해 주세요.',
	},
};

export default function CologSettingsWorkspace({
	slug = 'rilog',
	initialTab = 'profile',
	initialMembers,
}: CologSettingsWorkspaceProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
	const [savedProfile, setSavedProfile] = useState(() => ({ ...MOCK_COLOG_PROFILE_SETTINGS }));

	const profileForm = useCologProfileForm({ initialValue: savedProfile });
	const memberDrafts = useCologMemberDrafts({ initialMembers });

	const isProfileDirty = !isCologProfileSettingsEqual(profileForm.value, savedProfile);
	const isWorkspaceDirty =
		activeTab === 'profile' ? isProfileDirty : activeTab === 'members' ? memberDrafts.isDirty : false;

	const commitTabChange = useCallback(
		(nextTab: SettingsTab) => {
			profileForm.setValue(savedProfile);
			memberDrafts.handleCancelEditing();
			setActiveTab(nextTab);
			window.history.replaceState(window.history.state, '', buildCologSettingsPath(slug, nextTab));
		},
		[memberDrafts, profileForm, savedProfile, slug],
	);

	const { isLeaveModalOpen, onTabChangeRequest, onLeaveCancel, onLeaveConfirm } = useSettingsLeaveGuard({
		activeTab,
		isDirty: isWorkspaceDirty,
		onTabChange: commitTabChange,
	});

	const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const normalizedValue = profileForm.validate();

		if (normalizedValue === null) {
			return;
		}

		setSavedProfile(normalizedValue);
	};

	const renderHeaderActions = () => {
		if (activeTab === 'profile') {
			return (
				<Button
					form="profile-settings-form"
					type="submit"
					size="md"
					className="w-full max-w-40 sm:max-w-60 md:max-w-none lg:w-30 lg:max-w-none"
					disabled={!isProfileDirty}
				>
					변경사항 저장
				</Button>
			);
		}

		if (activeTab === 'members') {
			if (memberDrafts.isEditing) {
				return (
					<>
						<Button
							type="button"
							variant="secondary"
							size="md"
							className="w-full sm:w-30"
							onClick={memberDrafts.handleCancelEditing}
						>
							취소
						</Button>
						<Button
							form="member-settings-form"
							type="submit"
							size="md"
							className="w-full sm:w-30"
							disabled={memberDrafts.draftMembers.length === 0}
						>
							저장
						</Button>
					</>
				);
			}

			return (
				<>
					{/* TODO: 멤버 정보 수정 API 연동 후 주석 해제 */}
					{/* <Button
						type="button"
						variant="secondary"
						size="md"
						className="w-full sm:w-30"
						onClick={memberDrafts.handleStartEditing}
					>
						멤버 정보 수정
					</Button> */}
					<Button
						type="button"
						size="md"
						className="w-full sm:w-30"
						onClick={() => memberDrafts.setIsInviteModalOpen(true)}
					>
						+ 멤버 초대
					</Button>
				</>
			);
		}

		return undefined;
	};

	return (
		<PageShell
			isHeaderSticky
			header={
				<CologSettingsHeader
					activeTab={activeTab}
					title={TAB_HEADER_CONFIG[activeTab].title}
					description={TAB_HEADER_CONFIG[activeTab].description}
					onTabChangeRequest={onTabChangeRequest}
					actions={renderHeaderActions()}
				/>
			}
		>
			<div id={`settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`settings-tab-${activeTab}`}>
				{activeTab === 'profile' && <CologProfileSection form={profileForm} onSubmit={handleProfileSubmit} />}
				{activeTab === 'members' && <CologMemberManagementSection slug={slug} drafts={memberDrafts} />}
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
		</PageShell>
	);
}
