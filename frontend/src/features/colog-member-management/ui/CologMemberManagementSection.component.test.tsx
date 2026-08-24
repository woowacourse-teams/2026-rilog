import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import CologMemberManagementSection from './CologMemberManagementSection';

const { cologMembersInvitedMock, inviteMemberMock } = vi.hoisted(() => ({
	cologMembersInvitedMock: vi.fn(),
	inviteMemberMock: vi.fn(),
}));

vi.mock('@/features/analytics/model/events', () => ({ analytics: { cologMembersInvited: cologMembersInvitedMock } }));

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

	it('한 명 이상 초대에 성공했을 때만 초대 이벤트를 전송한다', async () => {
		render(<CologMemberManagementSection slug="rilog" drafts={drafts} />);

		fireEvent.click(screen.getByRole('button', { name: '초대 제출' }));

		await waitFor(() => expect(cologMembersInvitedMock).toHaveBeenCalledWith({ invitedMemberCount: 1 }));
		expect(inviteMemberMock).toHaveBeenCalledWith({
			slug: 'rilog',
			request: { userId: 7, permission: 'MEMBER' },
		});
	});

	it('모든 초대가 실패하면 초대 이벤트를 전송하지 않는다', async () => {
		inviteMemberMock.mockRejectedValue(new Error('invite failed'));
		render(<CologMemberManagementSection slug="rilog" drafts={drafts} />);

		fireEvent.click(screen.getByRole('button', { name: '초대 제출' }));

		await waitFor(() => expect(inviteMemberMock).toHaveBeenCalledOnce());
		expect(cologMembersInvitedMock).not.toHaveBeenCalled();
	});
});
