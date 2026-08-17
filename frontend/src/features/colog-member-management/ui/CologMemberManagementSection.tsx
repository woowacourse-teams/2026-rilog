'use client';

import { useEffect, useState } from 'react';

import type { FormEvent } from 'react';

import type { CologMemberPermission } from '@/domains/colog/model/colog-member';
import Button from '@/shared/ui/button/Button';
import PageShell from '@/shared/ui/page-shell/PageShell';
import type { SettingsTab } from '@/widgets/colog-settings/lib/get-next-tab';
import CologSettingsHeader from '@/widgets/colog-settings/ui/CologSettingsHeader';

import { MOCK_COLOG_MEMBERS } from '../lib/mock-colog-members';

import CologMemberRow from './CologMemberRow';
import MemberInviteModal from './MemberInviteModal';

interface CologMemberDraft {
	id: number;
	permission: CologMemberPermission;
	blogRole: string;
}

interface CologMemberDraftChange {
	permission?: CologMemberPermission;
	blogRole?: string;
}

interface CologMemberManagementSectionProps {
	onDirtyChange?: (isDirty: boolean) => void;
	onTabChangeRequest?: (nextTab: SettingsTab) => void;
}

export default function CologMemberManagementSection({
	onDirtyChange,
	onTabChangeRequest,
}: CologMemberManagementSectionProps) {
	const [members, setMembers] = useState(() => MOCK_COLOG_MEMBERS.map((member) => ({ ...member })));
	const [draftMembers, setDraftMembers] = useState<CologMemberDraft[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const displayedMembers = members.map((member) => {
		const draftMember = draftMembers.find((draft) => draft.id === member.id);

		return draftMember === undefined ? member : { ...member, ...draftMember };
	});

	useEffect(() => {
		onDirtyChange?.(draftMembers.length > 0);
	}, [draftMembers.length, onDirtyChange]);

	useEffect(
		() => () => {
			onDirtyChange?.(false);
		},
		[onDirtyChange],
	);

	const handleStartEditing = () => {
		setDraftMembers([]);
		setIsEditing(true);
	};

	const handleCancelEditing = () => {
		setDraftMembers([]);
		setIsEditing(false);
	};

	const handleSave = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setMembers((currentMembers) =>
			currentMembers.map((member) => {
				const draftMember = draftMembers.find((draft) => draft.id === member.id);

				return draftMember === undefined ? member : { ...member, ...draftMember };
			}),
		);
		setDraftMembers([]);
		setIsEditing(false);
	};

	const updateDraftMember = (memberId: number, change: CologMemberDraftChange) => {
		const originalMember = members.find((member) => member.id === memberId);

		if (originalMember === undefined) {
			return;
		}

		setDraftMembers((currentDrafts) => {
			const currentDraft = currentDrafts.find((draft) => draft.id === memberId);
			const nextDraft: CologMemberDraft = {
				id: memberId,
				permission: currentDraft?.permission ?? originalMember.permission,
				blogRole: currentDraft?.blogRole ?? originalMember.blogRole,
				...change,
			};

			if (nextDraft.permission === originalMember.permission && nextDraft.blogRole === originalMember.blogRole) {
				return currentDrafts.filter((draft) => draft.id !== memberId);
			}

			if (currentDraft === undefined) {
				return [...currentDrafts, nextDraft];
			}

			return currentDrafts.map((draft) => (draft.id === memberId ? nextDraft : draft));
		});
	};

	const handlePermissionChange = (memberId: number, permission: CologMemberPermission) => {
		updateDraftMember(memberId, { permission });
	};

	const handleBlogRoleChange = (memberId: number, blogRole: string) => {
		updateDraftMember(memberId, { blogRole });
	};

	return (
		<PageShell
			isHeaderSticky
			header={
				<CologSettingsHeader
					activeTab="members"
					title="멤버 관리"
					description="팀 멤버의 프로필, 역할, 권한을 관리합니다."
					onTabChangeRequest={onTabChangeRequest}
					actions={
						isEditing ? (
							<>
								<Button
									type="button"
									variant="secondary"
									size="md"
									className="w-full sm:w-30"
									onClick={handleCancelEditing}
								>
									취소
								</Button>
								<Button
									form="member-settings-form"
									type="submit"
									size="md"
									className="w-full sm:w-30"
									disabled={draftMembers.length === 0}
								>
									저장
								</Button>
							</>
						) : (
							<>
								<Button
									type="button"
									variant="secondary"
									size="md"
									className="w-full sm:w-30"
									onClick={handleStartEditing}
								>
									멤버 정보 수정
								</Button>
								<Button type="button" size="md" className="w-full sm:w-30" onClick={() => setIsInviteModalOpen(true)}>
									+ 멤버 초대
								</Button>
							</>
						)
					}
				/>
			}
		>
			<section className="px-6 sm:px-8 lg:px-0">
				<form id="member-settings-form" onSubmit={handleSave}>
					<div className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
						<table className="w-full min-w-3xl table-fixed border-collapse text-left">
							<caption className="sr-only">코로그 멤버 목록</caption>
							<colgroup>
								<col className="w-52" />
								<col className="w-31" />
								<col className="w-40" />
								<col className="w-37" />
								<col className="w-24" />
							</colgroup>
							<thead className="bg-background shadow-[inset_0_-1px_0_var(--color-border-default)]">
								<tr className="h-13.5 text-body-1 font-semibold text-text-secondary">
									<th scope="col" className="pl-6 font-semibold">
										멤버
									</th>
									<th scope="col" className="px-2 font-semibold">
										권한
									</th>
									<th scope="col" className="px-2 font-semibold">
										역할
									</th>
									<th scope="col" className="px-2 font-semibold">
										가입일
									</th>
									<th scope="col">
										<span className="sr-only">멤버 작업</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{displayedMembers.map((member) =>
									isEditing ? (
										<CologMemberRow
											key={member.id}
											member={member}
											isEditing
											onPermissionChange={handlePermissionChange}
											onBlogRoleChange={handleBlogRoleChange}
										/>
									) : (
										<CologMemberRow key={member.id} member={member} />
									),
								)}
							</tbody>
						</table>
					</div>
				</form>

				<MemberInviteModal open={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
			</section>
		</PageShell>
	);
}
