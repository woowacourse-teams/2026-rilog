'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';
import type { KeyboardEvent } from 'react';

import MemberManagementSection from '@/features/colog-member-management/ui/MemberManagementSection';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';


import { useSettingsLeaveGuard } from '../hooks/use-settings-leave-guard';
import { getNextTab, SETTINGS_TABS } from '../lib/get-next-tab';

import SettingsTabButton from './SettingsTabButton';

interface CologSettingsWorkspaceProps {
	slug: string;
}

export default function CologSettingsWorkspace({ slug }: CologSettingsWorkspaceProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>('members');
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
		<main className="h-dvh overflow-hidden bg-surface px-6 pt-8 pb-24 sm:px-8">
			<div className="mx-auto flex h-full w-full max-w-192 flex-col">
				<Link
					href={`/co-logs/${slug}`}
					aria-label="코로그로 돌아가기"
					className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-body-2 font-semibold text-text-primary hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus-ring"
				>
					<span aria-hidden="true">←</span>
				</Link>

				<div role="tablist" aria-label="팀 설정" className="mt-4 flex shrink-0 gap-2">
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
					{/* TODO: 추후 동등하게 Section으로 분리, 나아가서 퍼널 추상화 */}
					{activeTab === 'profile' && (
						<section aria-labelledby="profile-settings-title">
							<h1 id="profile-settings-title" className="text-heading-3 font-bold text-text-primary">
								프로필
							</h1>
							<p className="mt-0.5 text-body-1 text-text-secondary">팀의 기본 프로필 정보를 관리합니다.</p>
						</section>
					)}
					{activeTab === 'members' && <MemberManagementSection onDirtyChange={onDirtyChange} />}
					{activeTab === 'danger' && (
						<section aria-labelledby="danger-settings-title">
							<h1 id="danger-settings-title" className="text-heading-3 font-bold text-text-primary">
								위험 영역
							</h1>
							<p className="mt-0.5 text-body-1 text-text-secondary">팀 삭제와 같이 되돌릴 수 없는 작업을 관리합니다.</p>
						</section>
					)}
				</div>
			</div>

			<ConfirmModal
				open={isLeaveModalOpen}
				title="변경 사항을 저장하지 않고 이동할까요?"
				description="수정 중인 멤버 정보는 저장되지 않습니다."
				confirmLabel="이동"
				cancelLabel="계속 수정"
				variant="danger"
				onConfirm={onLeaveConfirm}
				onCancel={onLeaveCancel}
			/>
		</main>
	);
}
