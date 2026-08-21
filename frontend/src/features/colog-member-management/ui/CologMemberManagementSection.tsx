'use client';

import type { MemberInviteCandidate } from '../model/member-invite-candidate';
import type { useCologMemberDrafts } from '../hooks/use-colog-member-drafts';

import { useInviteCologMemberMutation } from '@/shared/api/cologs/mutations/use-invite-colog-member-mutation';

import CologMemberRow from './CologMemberRow';
import MemberInviteModal from './MemberInviteModal';

interface CologMemberManagementSectionProps {
	slug: string;
	drafts: ReturnType<typeof useCologMemberDrafts>;
}

export default function CologMemberManagementSection({ slug, drafts }: CologMemberManagementSectionProps) {
	const {
		displayedMembers,
		isEditing,
		isInviteModalOpen,
		setIsInviteModalOpen,
		handleSave,
		handlePermissionChange,
		handleBlogRoleChange,
	} = drafts;

	const { mutateAsync: inviteMember } = useInviteCologMemberMutation();

	const handleInvite = async (candidates: MemberInviteCandidate[]) => {
		const results = await Promise.allSettled(
			candidates.map((candidate) =>
				inviteMember({
					slug,
					request: {
						userId: candidate.userId,
						permission: 'MEMBER',
					},
				}),
			),
		);

		const hasSuccess = results.some((result) => result.status === 'fulfilled');

		if (hasSuccess) {
			window.location.reload();
		}
	};

	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<form id="member-settings-form" onSubmit={handleSave}>
				<div className="overflow-x-auto overflow-y-hidden overscroll-x-contain contain-[paint]">
					<table className="w-full min-w-3xl table-fixed border-collapse text-left">
						<caption className="sr-only">코로그 멤버 목록</caption>
						<colgroup>
							<col className="w-52" />
							<col className="w-31" />
							{/* <col className="w-40" /> */}
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
								{/* <th scope="col" className="px-2 font-semibold">
									역할
								</th> */}
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

			<MemberInviteModal open={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onInvite={handleInvite} />
		</section>
	);
}
