'use client';

import { useState } from 'react';

import type { useCologMemberDrafts } from '../hooks/use-colog-member-drafts';
import type { MemberInviteCandidate } from '../model/member-invite-candidate';

import type { CologMember } from '@/domains/blog/model/colog';
import { getAnalyticsErrorProperties } from '@/features/analytics/lib/get-analytics-error-properties';
import { analytics } from '@/features/analytics/model/events';
import { canRemoveCologMember } from '@/features/colog-member-management/lib/can-remove-colog-member';
import { getApiErrorMessage, isErrorDetail, normalizeApiError } from '@/shared/api/api-error';
import { useInviteCologMemberMutation } from '@/shared/api/cologs/mutations/use-invite-colog-member-mutation';
import { useRemoveCologMemberMutation } from '@/shared/api/cologs/mutations/use-remove-colog-member-mutation';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import AlertModal from '@/shared/ui/modal/AlertModal';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

import CologMemberRow from './CologMemberRow';
import MemberInviteModal from './MemberInviteModal';

interface CologMemberManagementSectionProps {
	cologId: number;
	slug: string;
	drafts: ReturnType<typeof useCologMemberDrafts>;
}

const REMOVE_MEMBER_ERROR_FALLBACK_MESSAGE = '멤버를 내보내지 못했어요. 다시 시도해 주세요.';

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
		handleRemoveMember,
	} = drafts;
	const [memberToRemove, setMemberToRemove] = useState<CologMember | null>(null);
	const [isRemoveCompleteModalOpen, setIsRemoveCompleteModalOpen] = useState(false);

	const { mutateAsync: inviteMember } = useInviteCologMemberMutation();
	const removeMember = useRemoveCologMemberMutation();
	const { data: currentUser } = useMyInfoQuery({ select: (response) => response.data });
	const removeMemberErrorMessage = removeMember.isError
		? getApiErrorMessage(removeMember.error, REMOVE_MEMBER_ERROR_FALLBACK_MESSAGE)
		: undefined;

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

	const handleRemoveConfirm = async () => {
		if (memberToRemove === null || removeMember.isPending) {
			return;
		}

		try {
			await removeMember.mutateAsync({ slug, memberId: memberToRemove.id });
			handleRemoveMember(memberToRemove.id);
			setMemberToRemove(null);
			setIsRemoveCompleteModalOpen(true);
		} catch {
			// mutation 오류는 확인 모달의 description에 표시한다.
		}
	};

	const handleRemoveCancel = () => {
		removeMember.reset();
		setMemberToRemove(null);
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
									<CologMemberRow
										key={member.id}
										member={member}
										canRemove={canRemoveCologMember(currentUser?.slug, displayedMembers, member)}
										onRemove={() => {
											removeMember.reset();
											setMemberToRemove(member);
										}}
									/>
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

			<ConfirmModal
				open={memberToRemove !== null}
				title={`${memberToRemove?.nickname ?? ''} 님을 내보낼까요?`}
				description={
					<>
						<span>내보낸 멤버는 나중에 다시 초대할 수 있습니다.</span>
						{removeMemberErrorMessage === undefined ? null : (
							<span className="mt-2 block text-danger">{removeMemberErrorMessage}</span>
						)}
					</>
				}
				confirmLabel="내보내기"
				variant="danger"
				isPending={removeMember.isPending}
				onConfirm={() => void handleRemoveConfirm()}
				onCancel={handleRemoveCancel}
			/>

			<AlertModal
				open={isRemoveCompleteModalOpen}
				title="성공적으로 내보냈어요."
				onAction={() => undefined}
				onClose={() => setIsRemoveCompleteModalOpen(false)}
			/>
		</section>
	);
}
