'use client';

import { useCallback, useState } from 'react';

import type { FormEvent } from 'react';

import { analytics, type CologProfileChangedField } from '@/features/analytics/model/events';
import { useCologChapterDrafts } from '@/features/colog-chapter-management/hooks/use-colog-chapter-drafts';
import type { CologChapter } from '@/features/colog-chapter-management/model/colog-chapter';
import CologChapterManagementSection from '@/features/colog-chapter-management/ui/CologChapterManagementSection';
import CologDangerZoneSection from '@/features/colog-danger-zone/ui/CologDangerZoneSection';
import { useCologMemberDrafts } from '@/features/colog-member-management/hooks/use-colog-member-drafts';
import { mapCologMembersResponse } from '@/features/colog-member-management/lib/map-colog-member-response';
import CologMemberManagementSection from '@/features/colog-member-management/ui/CologMemberManagementSection';
import { useCologProfileForm } from '@/features/colog-profile-management/hooks/use-colog-profile-form';
import { useSaveCologProfile } from '@/features/colog-profile-management/hooks/use-save-colog-profile';
import { mapCologProfileSettingsResponse } from '@/features/colog-profile-management/lib/map-colog-profile-settings-response';
import { isCologProfileSettingsEqual } from '@/features/colog-profile-management/lib/validate-colog-profile-settings';
import type { CologProfileSettingsValue } from '@/features/colog-profile-management/model/colog-profile-settings';
import CologProfileSection from '@/features/colog-profile-management/ui/CologProfileSection';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { useCheckNicknameAvailabilityMutation } from '@/shared/api/availability/mutations/use-check-nickname-availability-mutation';
import { useBlogPublicProfileQuery } from '@/shared/api/blogs/queries/public-profile/use-query';
import { useCologMembersQuery } from '@/shared/api/cologs/queries/members/use-query';
import { useSettingsLeaveGuard } from '@/shared/hooks/use-settings-leave-guard';
import { buildCologSettingsPath, type CologSettingsTab } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import PageShell from '@/shared/ui/page-shell/PageShell';
import SettingsHeader from '@/shared/ui/settings/SettingsHeader';

import { COLOG_SETTINGS_TABS } from '../lib/colog-settings-tabs';

interface CologSettingsWorkspaceProps {
	slug: string;
	initialTab?: CologSettingsTab;
}

interface CologSettingsWorkspaceContentProps {
	cologId: number;
	slug: string;
	initialTab: CologSettingsTab;
	initialProfile: CologProfileSettingsValue;
}

const TAB_HEADER_CONFIG: Record<CologSettingsTab, { title: string; description: string }> = {
	profile: {
		title: '프로필',
		description: '팀의 기본 정보와 소개를 관리합니다.',
	},
	members: {
		title: '멤버 관리',
		description: '팀 멤버의 프로필, 역할, 권한을 관리합니다.',
	},
	chapters: {
		title: '챕터 관리',
		description: '팀의 챕터와 게시글을 관리합니다.',
	},
	danger: {
		title: '위험 영역',
		description: '되돌릴 수 없는 작업입니다. 진행하기 전에 내용을 확인해 주세요.',
	},
};

// TODO: 챕터 조회 API의 게시글 수 계약이 준비되면 이 목업 목록을 조회 결과로 대체한다.
const INITIAL_MOCK_CHAPTERS: CologChapter[] = [
	{ id: 1, name: '프론트엔드', postCount: 3 },
	{ id: 2, name: '백엔드', postCount: 7 },
	{ id: 3, name: '백엔드', postCount: 7 },
	{ id: 4, name: '백엔드', postCount: 7 },
	{ id: 5, name: '백엔드', postCount: 7 },
	{ id: 6, name: '백엔드', postCount: 7 },
	{ id: 7, name: '백엔드', postCount: 7 },
	{ id: 8, name: '백엔드', postCount: 7 },
	{ id: 9, name: '백엔드', postCount: 7 },
	{ id: 10, name: '백엔드', postCount: 7 },
	{ id: 11, name: '백엔드', postCount: 7 },
];

const getChangedProfileFields = (
	previousValue: CologProfileSettingsValue,
	nextValue: CologProfileSettingsValue,
): CologProfileChangedField[] => {
	const changedFields: CologProfileChangedField[] = [];
	const hasTextChanged = (field: 'name' | 'description' | 'serviceUrl' | 'githubUrl') =>
		(nextValue[field] ?? '').trim() !== (previousValue[field] ?? '').trim();

	if (hasTextChanged('name')) changedFields.push('name');
	if (nextValue.logoFile !== null || nextValue.profileImageUrl !== previousValue.profileImageUrl) {
		changedFields.push('logo');
	}
	if (nextValue.coverImageFile !== null || nextValue.coverImageUrl !== previousValue.coverImageUrl) {
		changedFields.push('cover_image');
	}
	if (hasTextChanged('description')) changedFields.push('introduction');
	if (hasTextChanged('serviceUrl')) changedFields.push('service_url');
	if (hasTextChanged('githubUrl')) changedFields.push('github_url');

	return changedFields;
};

export default function CologSettingsWorkspace({ slug, initialTab = 'profile' }: CologSettingsWorkspaceProps) {
	// TODO: profile 섹션 내부로 이동
	const profileQuery = useBlogPublicProfileQuery({
		slug,
		select: (response) =>
			response.data === undefined
				? undefined
				: {
						cologId: response.data.id,
						profile: mapCologProfileSettingsResponse(response.data),
					},
	});

	if (profileQuery.isPending) {
		return (
			<PageShell>
				<p className="flex min-h-64 items-center justify-center text-body-2 text-text-secondary" role="status">
					팀 프로필을 불러오는 중...
				</p>
			</PageShell>
		);
	}

	if (profileQuery.isError || profileQuery.data === undefined) {
		return (
			<PageShell>
				<div className="flex min-h-64 flex-col items-center justify-center gap-5 text-center" role="alert">
					<p className="text-body-2 text-text-secondary">팀 프로필을 불러오지 못했어요.</p>
					<Button variant="secondary" onClick={() => void profileQuery.refetch()}>
						다시 시도
					</Button>
				</div>
			</PageShell>
		);
	}

	return (
		<CologSettingsWorkspaceContent
			key={slug}
			cologId={profileQuery.data.cologId}
			slug={slug}
			initialTab={initialTab}
			initialProfile={profileQuery.data.profile}
		/>
	);
}

function CologSettingsWorkspaceContent({
	cologId,
	slug,
	initialTab,
	initialProfile,
}: CologSettingsWorkspaceContentProps) {
	const [activeTab, setActiveTab] = useState<CologSettingsTab>(initialTab);
	const [savedProfile, setSavedProfile] = useState(() => ({ ...initialProfile }));
	const [isNameAvailabilityRequired, setIsNameAvailabilityRequired] = useState(false);

	const profileForm = useCologProfileForm({ initialValue: savedProfile });
	const chapterDrafts = useCologChapterDrafts({ initialChapters: INITIAL_MOCK_CHAPTERS });
	const { data: initialMembers } = useCologMembersQuery({ slug, select: mapCologMembersResponse });
	const memberDrafts = useCologMemberDrafts({ initialMembers });
	const saveCologProfile = useSaveCologProfile();
	const nameAvailability = useCheckNicknameAvailabilityMutation();

	const isProfileDirty = !isCologProfileSettingsEqual(profileForm.value, savedProfile);
	const isWorkspaceDirty =
		activeTab === 'profile'
			? isProfileDirty
			: activeTab === 'members'
				? memberDrafts.isDirty
				: activeTab === 'chapters'
					? chapterDrafts.isDirty
					: false;

	const commitTabChange = useCallback(
		(nextTab: CologSettingsTab, path: string) => {
			profileForm.setValue(savedProfile);
			nameAvailability.reset();
			setIsNameAvailabilityRequired(false);
			memberDrafts.handleCancelEditing();
			chapterDrafts.handleCancelEditing();
			chapterDrafts.setIsCreateModalOpen(false);
			setActiveTab(nextTab);
			window.history.replaceState(window.history.state, '', path);
		},
		[chapterDrafts, memberDrafts, nameAvailability, profileForm, savedProfile],
	);

	const { isLeaveModalOpen, onTabChangeRequest, onLeaveCancel, onLeaveConfirm } = useSettingsLeaveGuard({
		activeTab,
		isDirty: isWorkspaceDirty,
		buildPath: (nextTab) => buildCologSettingsPath(slug, nextTab),
		onTabChange: commitTabChange,
	});

	const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (saveCologProfile.isPending) {
			return;
		}

		const normalizedValue = profileForm.validate();

		if (normalizedValue === null) {
			return;
		}

		const hasNameChanged = normalizedValue.name !== savedProfile.name.trim();
		if (hasNameChanged && !nameAvailability.isSuccess) {
			setIsNameAvailabilityRequired(true);
			profileForm.refs.name.current?.focus();
			return;
		}
		const changedFields = getChangedProfileFields(savedProfile, normalizedValue);

		try {
			const savedValue = await saveCologProfile.mutateAsync({ slug, value: normalizedValue });
			profileForm.setValue(savedValue);
			setSavedProfile(savedValue);
			analytics.cologProfileUpdated({ changedFields });
			nameAvailability.reset();
			setIsNameAvailabilityRequired(false);
		} catch {
			// mutation 상태의 error를 폼 하단에 표시한다.
		}
	};

	const handleNameAvailabilityCheck = async () => {
		setIsNameAvailabilityRequired(false);
		const normalizedName = profileForm.validateName();
		if (normalizedName === null) {
			return;
		}

		profileForm.setValue({ ...profileForm.value, name: normalizedName });

		try {
			await nameAvailability.mutateAsync(normalizedName);
		} catch {
			// 오류 메시지는 mutation 상태를 통해 입력 하단에 표시한다.
		}
	};

	const profileErrorMessage = saveCologProfile.isError
		? getApiErrorMessage(saveCologProfile.error, '팀 프로필을 저장하지 못했어요. 다시 시도해 주세요.')
		: null;
	const nameAvailabilityMessage = nameAvailability.isSuccess
		? nameAvailability.data.message
		: nameAvailability.isError
			? getApiErrorMessage(nameAvailability.error, '팀 이름 중복 확인에 실패했습니다.')
			: undefined;
	const displayedNameAvailabilityStatus = isNameAvailabilityRequired ? 'error' : nameAvailability.status;
	const displayedNameAvailabilityMessage = isNameAvailabilityRequired
		? '팀 이름 중복 확인이 필요합니다.'
		: nameAvailabilityMessage;

	const renderHeaderActions = () => {
		if (activeTab === 'profile' && isProfileDirty) {
			return (
				<Button
					form="profile-settings-form"
					type="submit"
					size="md"
					className="w-full max-w-40 sm:max-w-60 md:max-w-none lg:w-30 lg:max-w-none"
					isPending={saveCologProfile.isPending}
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

		if (activeTab === 'chapters') {
			if (chapterDrafts.isEditing) {
				return (
					<>
						<Button
							type="button"
							variant="secondary"
							size="md"
							className="w-full sm:w-30"
							onClick={chapterDrafts.handleCancelEditing}
						>
							취소
						</Button>
						<Button
							type="button"
							size="md"
							className="w-full sm:w-30"
							disabled={!chapterDrafts.isDirty}
							onClick={chapterDrafts.handleSave}
						>
							저장
						</Button>
					</>
				);
			}

			return (
				<>
					<Button
						type="button"
						variant="secondary"
						size="md"
						className="w-full sm:w-30"
						onClick={chapterDrafts.handleStartEditing}
					>
						챕터 수정
					</Button>
					<Button
						type="button"
						size="md"
						className="w-full sm:w-30"
						onClick={() => chapterDrafts.setIsCreateModalOpen(true)}
					>
						+ 챕터 추가
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
				<SettingsHeader
					activeTab={activeTab}
					tabs={COLOG_SETTINGS_TABS}
					tabListLabel="팀 설정"
					idPrefix="colog-settings"
					title={TAB_HEADER_CONFIG[activeTab].title}
					description={TAB_HEADER_CONFIG[activeTab].description}
					onTabChangeRequest={onTabChangeRequest}
					actions={renderHeaderActions()}
				/>
			}
		>
			<div id={`colog-settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`colog-settings-tab-${activeTab}`}>
				{activeTab === 'profile' && (
					<>
						<CologProfileSection
							form={profileForm}
							onSubmit={(event) => void handleProfileSubmit(event)}
							disabled={saveCologProfile.isPending}
							nameAvailabilityStatus={displayedNameAvailabilityStatus}
							nameAvailabilityMessage={displayedNameAvailabilityMessage}
							onNameAvailabilityCheck={() => void handleNameAvailabilityCheck()}
							onValueChange={(field) => {
								saveCologProfile.reset();
								if (field === 'name') {
									nameAvailability.reset();
									setIsNameAvailabilityRequired(false);
								}
							}}
						/>
						{profileErrorMessage !== null && (
							<p
								className="mx-6 mt-4 rounded-md border border-danger bg-background p-3 text-label-2 text-danger sm:mx-8 lg:mx-0"
								role="alert"
							>
								{profileErrorMessage}
							</p>
						)}
					</>
				)}
				{activeTab === 'members' && (
					<CologMemberManagementSection cologId={cologId} slug={slug} drafts={memberDrafts} />
				)}
				{activeTab === 'chapters' && (
					<CologChapterManagementSection
						chapters={chapterDrafts.displayedChapters}
						isEditing={chapterDrafts.isEditing}
						onChapterNameChange={chapterDrafts.handleNameChange}
						isCreateModalOpen={chapterDrafts.isCreateModalOpen}
						onCloseCreateModal={() => chapterDrafts.setIsCreateModalOpen(false)}
						onCreateChapter={chapterDrafts.handleAddChapter}
					/>
				)}
				{activeTab === 'danger' && <CologDangerZoneSection slug={slug} />}
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
