'use client';

import { useCallback, useState } from 'react';

import type { FormEvent } from 'react';

import { normalizeUserNickname } from '@/domains/user/lib/validate-user-profile';
import { useChapterDrafts } from '@/features/chapter-management/hooks/use-chapter-drafts';
import type { Chapter } from '@/features/chapter-management/model/chapter';
import RilogDangerZoneSection from '@/features/rilog-danger-zone/ui/RilogDangerZoneSection';
import { useRilogProfileForm } from '@/features/rilog-profile-management/hooks/use-rilog-profile-form';
import { useSaveRilogProfile } from '@/features/rilog-profile-management/hooks/use-save-rilog-profile';
import { mapRilogProfileSettingsResponse } from '@/features/rilog-profile-management/lib/map-rilog-profile-settings-response';
import { isRilogProfileSettingsEqual } from '@/features/rilog-profile-management/lib/validate-rilog-profile-settings';
import type { RilogProfileSettingsValue } from '@/features/rilog-profile-management/model/rilog-profile-settings';
import RilogProfileSection from '@/features/rilog-profile-management/ui/RilogProfileSection';
import RilogSeriesManagementSection from '@/features/rilog-series-management/ui/RilogSeriesManagementSection';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { useCheckNicknameAvailabilityMutation } from '@/shared/api/availability/mutations/use-check-nickname-availability-mutation';
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
	series: { title: '시리즈 관리', description: '블로그 시리즈를 관리합니다.' },
	danger: { title: '위험 영역', description: '되돌릴 수 없는 작업입니다. 진행하기 전에 내용을 확인해 주세요.' },
};

// TODO: 챕터 조회 API의 게시글 수 계약이 준비되면 이 목업 목록을 조회 결과로 대체한다.
const INITIAL_MOCK_CHAPTERS: Chapter[] = [
	{ id: 1, name: '웹 개발', postCount: 3 },
	{ id: 2, name: '기록', postCount: 7 },
];

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

	return (
		<RilogSettingsWorkspaceContent key={slug} slug={slug} initialTab={initialTab} initialProfile={profileQuery.data} />
	);
}

function RilogSettingsWorkspaceContent({ slug, initialTab, initialProfile }: RilogSettingsWorkspaceContentProps) {
	const [activeTab, setActiveTab] = useState<RilogSettingsTab>(initialTab);
	const [savedProfile, setSavedProfile] = useState(() => ({ ...initialProfile }));
	const [isNicknameAvailabilityRequired, setIsNicknameAvailabilityRequired] = useState(false);

	const profileForm = useRilogProfileForm({ initialValue: savedProfile });
	const chapterDrafts = useChapterDrafts({ initialChapters: INITIAL_MOCK_CHAPTERS });
	const saveRilogProfile = useSaveRilogProfile();
	const nicknameAvailability = useCheckNicknameAvailabilityMutation();
	const isProfileDirty = !isRilogProfileSettingsEqual(profileForm.value, savedProfile);
	const isWorkspaceDirty =
		activeTab === 'profile' ? isProfileDirty : activeTab === 'series' ? chapterDrafts.isDirty : false;

	const commitTabChange = useCallback(
		(nextTab: RilogSettingsTab, path: string) => {
			profileForm.setValue(savedProfile);
			nicknameAvailability.reset();
			setIsNicknameAvailabilityRequired(false);
			chapterDrafts.handleCancelEditing();
			chapterDrafts.setIsCreateModalOpen(false);
			setActiveTab(nextTab);
			window.history.replaceState(window.history.state, '', path);
		},
		[chapterDrafts, nicknameAvailability, profileForm, savedProfile],
	);

	const { isLeaveModalOpen, onTabChangeRequest, onLeaveCancel, onLeaveConfirm } = useSettingsLeaveGuard({
		activeTab,
		isDirty: isWorkspaceDirty,
		buildPath: (nextTab) => buildRilogSettingsPath(slug, nextTab),
		onTabChange: commitTabChange,
	});

	const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (saveRilogProfile.isPending) {
			return;
		}

		const normalizedValue = profileForm.validate();
		if (normalizedValue === null) {
			return;
		}

		const hasNicknameChanged = normalizedValue.nickname !== normalizeUserNickname(savedProfile.nickname);
		if (hasNicknameChanged && !nicknameAvailability.isSuccess) {
			setIsNicknameAvailabilityRequired(true);
			profileForm.refs.nickname.current?.focus();
			return;
		}

		try {
			const savedValue = await saveRilogProfile.mutateAsync({ slug, value: normalizedValue });
			profileForm.setValue(savedValue);
			setSavedProfile(savedValue);
			nicknameAvailability.reset();
			setIsNicknameAvailabilityRequired(false);
		} catch {
			// mutation 상태의 error를 폼 하단에 표시한다.
		}
	};

	const handleNicknameAvailabilityCheck = async () => {
		setIsNicknameAvailabilityRequired(false);
		const normalizedNickname = profileForm.validateNickname();
		if (normalizedNickname === null) {
			return;
		}

		profileForm.setValue({ ...profileForm.value, nickname: normalizedNickname });

		try {
			await nicknameAvailability.mutateAsync(normalizedNickname);
		} catch {
			// 오류 메시지는 mutation 상태를 통해 입력 하단에 표시한다.
		}
	};

	const profileErrorMessage = saveRilogProfile.isError
		? getApiErrorMessage(saveRilogProfile.error, '개인 프로필을 저장하지 못했어요. 다시 시도해 주세요.')
		: null;
	const nicknameAvailabilityMessage = nicknameAvailability.isSuccess
		? nicknameAvailability.data.message
		: nicknameAvailability.isError
			? getApiErrorMessage(nicknameAvailability.error, '닉네임 중복 확인에 실패했습니다.')
			: undefined;
	const displayedNicknameAvailabilityStatus = isNicknameAvailabilityRequired ? 'error' : nicknameAvailability.status;
	const displayedNicknameAvailabilityMessage = isNicknameAvailabilityRequired
		? '닉네임 중복 확인이 필요합니다.'
		: nicknameAvailabilityMessage;

	const renderHeaderActions = () => {
		if (activeTab === 'profile' && isProfileDirty) {
			return (
				<Button
					type="submit"
					form="profile-settings-form"
					size="md"
					className="w-full sm:w-30"
					isPending={saveRilogProfile.isPending}
				>
					변경사항 저장
				</Button>
			);
		}

		if (activeTab === 'series') {
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
						시리즈 수정
					</Button>
					<Button
						type="button"
						size="md"
						className="w-full sm:w-30"
						onClick={() => chapterDrafts.setIsCreateModalOpen(true)}
					>
						+ 시리즈 추가
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
					tabs={RILOG_SETTINGS_TABS}
					tabListLabel="개인 설정"
					idPrefix="rilog-settings"
					title={TAB_HEADER_CONFIG[activeTab].title}
					description={TAB_HEADER_CONFIG[activeTab].description}
					actions={renderHeaderActions()}
					onTabChangeRequest={onTabChangeRequest}
				/>
			}
		>
			<div id={`rilog-settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`rilog-settings-tab-${activeTab}`}>
				{activeTab === 'profile' && (
					<>
						<RilogProfileSection
							form={profileForm}
							onSubmit={(event) => void handleProfileSubmit(event)}
							disabled={saveRilogProfile.isPending}
							nicknameAvailabilityStatus={displayedNicknameAvailabilityStatus}
							nicknameAvailabilityMessage={displayedNicknameAvailabilityMessage}
							onNicknameAvailabilityCheck={() => void handleNicknameAvailabilityCheck()}
							onValueChange={(field) => {
								saveRilogProfile.reset();
								if (field === 'nickname') {
									nicknameAvailability.reset();
									setIsNicknameAvailabilityRequired(false);
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
				{activeTab === 'series' && <RilogSeriesManagementSection drafts={chapterDrafts} />}
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
