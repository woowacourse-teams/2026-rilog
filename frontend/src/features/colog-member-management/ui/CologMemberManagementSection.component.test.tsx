import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import CologMemberManagementSection from './CologMemberManagementSection';

const {
	cologMemberInvitationCompletedMock,
	cologMemberInvitationFailedMock,
	cologMemberInvitationStartedMock,
	inviteMemberMock,
} = vi.hoisted(() => ({
	cologMemberInvitationCompletedMock: vi.fn(),
	cologMemberInvitationFailedMock: vi.fn(),
	cologMemberInvitationStartedMock: vi.fn(),
	inviteMemberMock: vi.fn(),
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

vi.mock('./CologMemberRow', () => ({ default: () => null }));

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
} as unknown as ComponentProps<typeof CologMemberManagementSection>['drafts'];

describe('CologMemberManagementSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		inviteMemberMock.mockResolvedValue(undefined);
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
