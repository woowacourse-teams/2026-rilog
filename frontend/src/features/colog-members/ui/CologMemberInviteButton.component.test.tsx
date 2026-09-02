import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CologMemberInviteButton from './CologMemberInviteButton';

const cologMemberInvitationEntryClickedMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/analytics/model/events', () => ({
	analytics: { cologMemberInvitationEntryClicked: cologMemberInvitationEntryClickedMock },
}));

describe('CologMemberInviteButton', () => {
	it('멤버 관리 페이지로 이동하는 링크를 표시한다', () => {
		render(<CologMemberInviteButton slug="rilog-team" />);

		expect(screen.getByRole('link', { name: '멤버 추가' })).toHaveAttribute(
			'href',
			'/@rilog-team/settings?tab=members&invite=true',
		);
	});

	it('링크를 선택하면 member aside 진입 이벤트를 기록한다', async () => {
		const user = userEvent.setup();
		render(<CologMemberInviteButton slug="rilog-team" />);

		await user.click(screen.getByRole('link', { name: '멤버 추가' }));

		expect(cologMemberInvitationEntryClickedMock).toHaveBeenCalledWith({ entrySource: 'member_aside' });
	});
});
