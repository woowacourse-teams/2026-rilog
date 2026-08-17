'use client';

import { useRef } from 'react';

import type { SettingsTab } from '../lib/get-next-tab';
import type { KeyboardEvent } from 'react';

import Button from '@/shared/ui/button/Button';

import { getNextTab, SETTINGS_TABS } from '../lib/get-next-tab';

import SettingsTabButton from './SettingsTabButton';

interface CologSettingsHeaderProps {
	slug?: string;
	activeTab: SettingsTab;
	isProfileDirty: boolean;
	isMemberEditing: boolean;
	hasMemberDraft: boolean;
	onTabChangeRequest: (nextTab: SettingsTab) => void;
	onMemberEdit: () => void;
	onMemberCancel: () => void;
	onMemberInvite: () => void;
}

const SECTION_CONTENT = {
	profile: { title: '프로필', description: '팀의 기본 정보와 소개를 관리합니다.' },
	members: { title: '멤버 관리', description: '팀 멤버의 프로필, 역할, 권한을 관리합니다.' },
	danger: { title: '위험 영역', description: '되돌릴 수 없는 작업입니다. 진행하기 전에 내용을 확인해 주세요.' },
} as const;

export default function CologSettingsHeader({
	slug,
	activeTab,
	isProfileDirty,
	isMemberEditing,
	hasMemberDraft,
	onTabChangeRequest,
	onMemberEdit,
	onMemberCancel,
	onMemberInvite,
}: CologSettingsHeaderProps) {
	const tabRefs = useRef<Partial<Record<SettingsTab, HTMLButtonElement | null>>>({});
	const sectionContent = SECTION_CONTENT[activeTab];

	const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: SettingsTab) => {
		const nextTab = getNextTab(currentTab, event.key);
		if (nextTab === null) return;
		event.preventDefault();
		onTabChangeRequest(nextTab);
		tabRefs.current[nextTab]?.focus();
	};

	return (
		<div className="px-6 pt-4 sm:px-8 lg:px-0">
			<div role="tablist" aria-label="팀 설정" className="flex gap-2">
				{SETTINGS_TABS.map((tab) => (
					<SettingsTabButton
						key={tab.id}
						tab={tab}
						isActive={tab.id === activeTab}
						ref={(element) => {
							tabRefs.current[tab.id] = element;
						}}
						onClick={() => onTabChangeRequest(tab.id)}
						onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
					/>
				))}
			</div>
			<div className="flex flex-wrap items-end justify-between gap-6 pt-8 pb-6">
				<div>
					<h1 id={`${activeTab}-settings-title`} className="text-heading-3 font-bold text-text-primary">
						{sectionContent.title}
					</h1>
					<p className="mt-0.5 text-body-1 text-text-secondary">{sectionContent.description}</p>
				</div>
				<div className="ml-auto flex w-full shrink-0 justify-end gap-2 sm:w-auto">
					{activeTab === 'profile' && (
						<Button
							form="profile-settings-form"
							type="submit"
							size="md"
							className="w-full max-w-40 sm:max-w-60 md:max-w-none lg:w-30 lg:max-w-none"
							disabled={!isProfileDirty}
						>
							변경사항 저장
						</Button>
					)}
					{activeTab === 'members' &&
						(isMemberEditing ? (
							<>
								<Button type="button" variant="secondary" size="md" className="w-full sm:w-30" onClick={onMemberCancel}>
									취소
								</Button>
								<Button
									form="member-settings-form"
									type="submit"
									size="md"
									className="w-full sm:w-30"
									disabled={!hasMemberDraft}
								>
									저장
								</Button>
							</>
						) : (
							<>
								<Button type="button" variant="secondary" size="md" className="w-full sm:w-30" onClick={onMemberEdit}>
									멤버 정보 수정
								</Button>
								<Button type="button" size="md" className="w-full sm:w-30" onClick={onMemberInvite}>
									+ 멤버 초대
								</Button>
							</>
						))}
				</div>
			</div>
		</div>
	);
}
