'use client';

import type { useCologMemberDrafts } from '../hooks/use-colog-member-drafts';
import type { MemberInviteCandidate } from '../model/member-invite-candidate';

import { getAnalyticsErrorProperties } from '@/features/analytics/lib/get-analytics-error-properties';
import { analytics } from '@/features/analytics/model/events';
import { isErrorDetail, normalizeApiError } from '@/shared/api/api-error';
import { useInviteCologMemberMutation } from '@/shared/api/cologs/mutations/use-invite-colog-member-mutation';

import CologMemberRow from './CologMemberRow';
import MemberInviteModal from './MemberInviteModal';

interface CologMemberManagementSectionProps {
	cologId: number;
	slug: string;
	drafts: ReturnType<typeof useCologMemberDrafts>;
}

const getInvitationErrorCode = (error: unknown) => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'type' in error &&
		error.type === 'api' &&
		'detail' in error &&
		isErrorDetail(error.detail)
	) {
		return error.detail.errorCode;
	}

	const normalizedError = normalizeApiError(error);

	if (normalizedError.type === 'api') {
		return normalizedError.detail.errorCode;
	}

	return getAnalyticsErrorProperties(error).errorCode;
};

export default function CologMemberManagementSection({ cologId, slug, drafts }: CologMemberManagementSectionProps) {
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
		analytics.cologMemberInvitationStarted({ cologId, candidateCount: candidates.length });

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

		const successfulInvitationCount = results.filter((result) => result.status === 'fulfilled').length;
		const failedInvitationResults = results.filter((result) => result.status === 'rejected');

		analytics.cologMemberInvitationCompleted({
			cologId,
			invitedCount: successfulInvitationCount,
			failedCount: failedInvitationResults.length,
		});

		const failedErrorCodes = new Set(failedInvitationResults.map((result) => getInvitationErrorCode(result.reason)));

		for (const errorCode of failedErrorCodes) {
			analytics.cologMemberInvitationFailed({ cologId, errorCode });
		}

		if (successfulInvitationCount > 0) {
			window.location.reload();
		}
	};

	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<form id="member-settings-form" onSubmit={handleSave}>
				<div className="overflow-x-auto overflow-y-hidden overscroll-x-contain contain-[paint]">
					<table className="w-full min-w-3xl table-fixed border-collapse text-left">
						<caption className="sr-only">팀 멤버 목록</caption>
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

			<MemberInviteModal
				slug={slug}
				open={isInviteModalOpen}
				onClose={() => setIsInviteModalOpen(false)}
				onInvite={(candidates) => void handleInvite(candidates)}
			/>
		</section>
	);
}
