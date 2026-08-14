'use client';

import { useState } from 'react';

import type { FormEvent } from 'react';

import type { CologMemberPermission } from '@/domains/colog/model/colog-member';
import Button from '@/shared/ui/button/Button';

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

export default function MemberManagementSection() {
	const [members, setMembers] = useState(() => MOCK_COLOG_MEMBERS.map((member) => ({ ...member })));
	const [draftMembers, setDraftMembers] = useState<CologMemberDraft[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const displayedMembers = members.map((member) => {
		const draftMember = draftMembers.find((draft) => draft.id === member.id);

		return draftMember === undefined ? member : { ...member, ...draftMember };
	});

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
		<section aria-labelledby="member-management-title" className="h-full min-h-0">
			<form className="flex h-full min-h-0 flex-col" onSubmit={handleSave}>
				<div className="flex shrink-0 flex-wrap items-end justify-between gap-6">
					<div>
						<h1 id="member-management-title" className="text-heading-3 font-bold text-text-primary">
							멤버 관리
						</h1>
						<p className="mt-0.5 text-body-1 text-text-secondary">
							팀 멤버의 프로필, 역할, 권한과 참여 상태를 관리합니다.
						</p>
					</div>

					<div className="flex gap-2">
						{isEditing ? (
							<>
								<Button
									type="button"
									variant="secondary"
									size="md"
									className="w-30 px-2 text-label-1"
									onClick={handleCancelEditing}
								>
									취소
								</Button>
								<Button type="submit" size="md" className="w-30 px-2 text-label-1" disabled={draftMembers.length === 0}>
									저장
								</Button>
							</>
						) : (
							<>
								<Button
									type="button"
									variant="secondary"
									size="md"
									className="w-30 px-2 text-label-1"
									onClick={handleStartEditing}
								>
									멤버 정보 수정
								</Button>
								<Button
									type="button"
									size="md"
									className="w-30 px-2 text-label-1"
									onClick={() => setIsInviteModalOpen(true)}
								>
									+ 멤버 초대
								</Button>
							</>
						)}
					</div>
				</div>

				<div className="mt-14 min-h-0 flex-1 overflow-auto">
					<table className="w-full min-w-192 table-fixed border-collapse text-left">
						<caption className="sr-only">코로그 멤버 목록</caption>
						<colgroup>
							<col className="w-52" />
							<col className="w-31" />
							<col className="w-40" />
							<col className="w-37" />
							<col className="w-24" />
						</colgroup>
						<thead className="sticky top-0 z-10 bg-surface">
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
	);
}
