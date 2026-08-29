import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import CologMemberManagementSection from './CologMemberManagementSection';

const {
	cologMemberInvitationCompletedMock,
	cologMemberInvitationFailedMock,
	cologMemberInvitationStartedMock,
	inviteMemberMock,
	removeMemberMock,
	resetRemoveMemberMock,
	useRemoveCologMemberMutationMock,
} = vi.hoisted(() => ({
	cologMemberInvitationCompletedMock: vi.fn(),
	cologMemberInvitationFailedMock: vi.fn(),
	cologMemberInvitationStartedMock: vi.fn(),
	inviteMemberMock: vi.fn(),
	removeMemberMock: vi.fn(),
	resetRemoveMemberMock: vi.fn(),
	useRemoveCologMemberMutationMock: vi.fn(),
}));

vi.mock('@/features/analytics/model/events', () => ({
	analytics: {
		cologMemberInvitationCompleted: cologMemberInvitationCompletedMock,
		cologMemberInvitationFailed: cologMemberInvitationFailedMock,
		cologMemberInvitationStarted: cologMemberInvitationStartedMock,
	},
}));

vi.mock('@/shared/api/cologs/mutations/use-invite-colog-member-mutation', () => ({
	useInviteCologMemberMutation: () => ({ mutateAsync: inviteMemberMock }),
}));

vi.mock('@/shared/api/cologs/mutations/use-remove-colog-member-mutation', () => ({
	useRemoveCologMemberMutation: useRemoveCologMemberMutationMock,
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: () => ({ data: { slug: 'current-user' } }),
}));

vi.mock('./CologMemberRow', () => ({
	default: ({
		member,
		onRemove,
		canRemove,
	}: {
		member: { nickname: string };
		onRemove?: () => void;
		canRemove?: boolean;
	}) => (
		<tr>
			<td>
				{canRemove && (
					<button type="button" onClick={onRemove}>
						{member.nickname} 멤버 내보내기
					</button>
				)}
			</td>
		</tr>
	),
}));

vi.mock('./MemberInviteModal', () => ({
	default: ({ onInvite }: { onInvite?: (candidates: Array<{ userId: number; slug: string }>) => void }) => (
		<button type="button" onClick={() => onInvite?.([{ userId: 7, slug: 'new-member' }])}>
			초대 제출
		</button>
	),
}));

const drafts = {
	displayedMembers: [],
	isEditing: false,
	isInviteModalOpen: false,
	setIsInviteModalOpen: vi.fn(),
	handleSave: vi.fn(),
	handlePermissionChange: vi.fn(),
	handleBlogRoleChange: vi.fn(),
	handleRemoveMember: vi.fn(),
} as unknown as ComponentProps<typeof CologMemberManagementSection>['drafts'];

describe('CologMemberManagementSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		inviteMemberMock.mockResolvedValue(undefined);
		removeMemberMock.mockResolvedValue(undefined);
		useRemoveCologMemberMutationMock.mockReturnValue({
			error: null,
			isError: false,
			isPending: false,
			mutateAsync: removeMemberMock,
			reset: resetRemoveMemberMock,
		});
	});

	it('확인 후 선택한 멤버를 내보내고 화면 목록에서 제거한다', async () => {
		const user = userEvent.setup();
		const handleRemoveMember = vi.fn();
		const draftsWithMember = {
			...drafts,
			displayedMembers: [
				{
					id: 1,
					nickname: '현재 사용자',
					slug: 'current-user',
					profileImageUrl: null,
					permission: 'ADMIN' as const,
					blogRole: '',
					joinedAt: '2026-08-20T10:00:00Z',
				},
				{
					id: 7,
					nickname: '내보낼 멤버',
					slug: 'member',
					profileImageUrl: null,
					permission: 'MEMBER' as const,
					blogRole: '',
					joinedAt: '2026-08-20T10:00:00Z',
				},
			],
			handleRemoveMember,
		};
		render(<CologMemberManagementSection cologId={11} slug="@rilog" drafts={draftsWithMember} />);

		await user.click(screen.getByRole('button', { name: '내보낼 멤버 멤버 내보내기' }));
		const dialog = screen.getByRole('dialog', { name: '내보낼 멤버 님을 내보낼까요?' });
		await user.click(within(dialog).getByRole('button', { name: '내보내기' }));

		await waitFor(() => expect(removeMemberMock).toHaveBeenCalledWith({ slug: '@rilog', memberId: 7 }));
		expect(handleRemoveMember).toHaveBeenCalledWith(7);
		expect(screen.queryByRole('dialog', { name: '내보낼 멤버 님을 내보낼까요?' })).not.toBeInTheDocument();

		const completeDialog = screen.getByRole('alertdialog', { name: '성공적으로 내보냈어요.' });
		await waitFor(() => expect(within(completeDialog).getByRole('button', { name: '확인' })).toHaveFocus());
		await user.click(within(completeDialog).getByRole('button', { name: '확인' }));
		await waitFor(() =>
			expect(screen.queryByRole('alertdialog', { name: '성공적으로 내보냈어요.' })).not.toBeInTheDocument(),
		);
	});

	it('멤버 내보내기에 실패하면 확인 모달 description에 오류 메시지를 추가한다', async () => {
		const user = userEvent.setup();
		useRemoveCologMemberMutationMock.mockReturnValue({
			error: {},
			isError: true,
			isPending: false,
			mutateAsync: removeMemberMock,
			reset: resetRemoveMemberMock,
		});
		const draftsWithMember = {
			...drafts,
			displayedMembers: [
				{
					id: 1,
					nickname: '현재 사용자',
					slug: 'current-user',
					profileImageUrl: null,
					permission: 'ADMIN' as const,
					blogRole: '',
					joinedAt: '2026-08-20T10:00:00Z',
				},
				{
					id: 7,
					nickname: '내보낼 멤버',
					slug: 'member',
					profileImageUrl: null,
					permission: 'MEMBER' as const,
					blogRole: '',
					joinedAt: '2026-08-20T10:00:00Z',
				},
			],
		};
		render(<CologMemberManagementSection cologId={11} slug="rilog" drafts={draftsWithMember} />);

		await user.click(screen.getByRole('button', { name: '내보낼 멤버 멤버 내보내기' }));

		expect(screen.getByRole('dialog', { name: '내보낼 멤버 님을 내보낼까요?' })).toHaveAccessibleDescription(
			/멤버를 내보내지 못했어요\. 다시 시도해 주세요\./,
		);
	});

	it('현재 사용자와 권한이 같거나 높은 멤버에게는 내보내기 버튼을 표시하지 않는다', () => {
		const draftsWithSamePermissionMember = {
			...drafts,
			displayedMembers: [
				{
					id: 1,
					nickname: '현재 사용자',
					slug: 'current-user',
					profileImageUrl: null,
					permission: 'ADMIN' as const,
					blogRole: '',
					joinedAt: '2026-08-20T10:00:00Z',
				},
				{
					id: 2,
					nickname: '다른 관리자',
					slug: 'another-admin',
					profileImageUrl: null,
					permission: 'ADMIN' as const,
					blogRole: '',
					joinedAt: '2026-08-20T10:00:00Z',
				},
				{
					id: 3,
					nickname: '팀 소유자',
					slug: 'owner',
					profileImageUrl: null,
					permission: 'OWNER' as const,
					blogRole: '',
					joinedAt: '2026-08-20T10:00:00Z',
				},
			],
		};

		render(<CologMemberManagementSection cologId={11} slug="rilog" drafts={draftsWithSamePermissionMember} />);

		expect(screen.queryByRole('button', { name: '다른 관리자 멤버 내보내기' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '팀 소유자 멤버 내보내기' })).not.toBeInTheDocument();
	});

	it('초대 시작과 완료 이벤트를 같은 cologId로 기록한다', async () => {
		render(<CologMemberManagementSection cologId={11} slug="rilog" drafts={drafts} />);

		fireEvent.click(screen.getByRole('button', { name: '초대 제출' }));

		await waitFor(() =>
			expect(cologMemberInvitationCompletedMock).toHaveBeenCalledWith({
				cologId: 11,
				invitedCount: 1,
				failedCount: 0,
			}),
		);
		expect(cologMemberInvitationStartedMock).toHaveBeenCalledWith({ cologId: 11, candidateCount: 1 });
		expect(inviteMemberMock).toHaveBeenCalledWith({
			slug: 'rilog',
			request: { userId: 7, permission: 'MEMBER' },
		});
		expect(cologMemberInvitationFailedMock).not.toHaveBeenCalled();
	});

	it('실패한 초대는 완료 카운트와 실패 코드 이벤트를 함께 기록한다', async () => {
		inviteMemberMock.mockRejectedValue({
			type: 'api',
			detail: {
				status: 409,
				error: 'CONFLICT',
				errorCode: 'COLOG_MEMBER_ALREADY_EXISTS',
				message: '이미 등록된 멤버입니다.',
				invalidParams: null,
			},
		});
		render(<CologMemberManagementSection cologId={11} slug="rilog" drafts={drafts} />);

		fireEvent.click(screen.getByRole('button', { name: '초대 제출' }));

		await waitFor(() => expect(inviteMemberMock).toHaveBeenCalledOnce());
		expect(cologMemberInvitationCompletedMock).toHaveBeenCalledWith({
			cologId: 11,
			invitedCount: 0,
			failedCount: 1,
		});
		expect(cologMemberInvitationFailedMock).toHaveBeenCalledWith({
			cologId: 11,
			errorCode: 'COLOG_MEMBER_ALREADY_EXISTS',
		});
	});
});
