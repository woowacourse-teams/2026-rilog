import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BlogMemberResponse } from '@/shared/api/cologs/types';

import CologMemberAside from './CologMemberAside';

const { useCologMembersQueryMock, useCurrentCologPermissionMock } = vi.hoisted(() => ({
	useCologMembersQueryMock: vi.fn(),
	useCurrentCologPermissionMock: vi.fn(),
}));

vi.mock('@/features/colog-settings-access/hooks/use-current-colog-permission', () => ({
	useCurrentCologPermission: useCurrentCologPermissionMock,
}));

vi.mock('@/shared/api/cologs/queries/members/use-query', () => ({
	useCologMembersQuery: useCologMembersQueryMock,
}));

vi.mock('./CologMemberInviteButton', () => ({
	default: function MockCologMemberInviteButton() {
		return <button type="button">멤버 추가</button>;
	},
}));

const MEMBERS: BlogMemberResponse[] = [
	{
		id: 1,
		userId: 10,
		nickname: '새봄',
		slug: 'saebom',
		profileImageUrl: 'https://images.rilog.test/saebom.png',
		permission: 'OWNER',
		blogRole: '프론트엔드',
		joinedAt: '2026-08-20T00:00:00',
	},
	{
		id: 2,
		userId: 11,
		nickname: '여름',
		slug: 'yeoreum',
		profileImageUrl: null,
		permission: 'MEMBER',
		blogRole: '백엔드',
		joinedAt: '2026-08-20T00:00:00',
	},
];

describe('CologMemberAside', () => {
	it('API 멤버 응답을 우측 멤버 목록에 표시한다', () => {
		useCurrentCologPermissionMock.mockReturnValue('OWNER');
		useCologMembersQueryMock.mockReturnValue({
			data: { status: 200, message: 'OK', data: MEMBERS },
			isPending: false,
			isError: false,
		});

		render(<CologMemberAside slug="rilog-team" />);

		const members = screen.getByRole('region', { name: 'Members' });
		expect(within(members).getByRole('img', { name: '새봄 프로필' })).toBeInTheDocument();
		expect(within(members).getByRole('img', { name: '여름 프로필' })).toBeInTheDocument();
		expect(within(members).getByRole('button', { name: '멤버 추가' })).toBeInTheDocument();
	});

	it('일반 멤버에게 멤버 추가 action을 표시하지 않는다', () => {
		useCurrentCologPermissionMock.mockReturnValue('MEMBER');
		useCologMembersQueryMock.mockReturnValue({
			data: { status: 200, message: 'OK', data: MEMBERS },
			isPending: false,
			isError: false,
		});

		render(<CologMemberAside slug="rilog-team" />);

		expect(screen.queryByRole('button', { name: '멤버 추가' })).not.toBeInTheDocument();
	});

	it('불러오는 동안 상태를 안내한다', () => {
		useCologMembersQueryMock.mockReturnValue({ isPending: true, isError: false });

		render(<CologMemberAside slug="rilog-team" />);

		expect(screen.getByRole('status')).toHaveTextContent('멤버 목록을 불러오는 중...');
	});

	it('API 실패 시 재시도할 수 있다', async () => {
		const user = userEvent.setup();
		const refetch = vi.fn();
		useCologMembersQueryMock.mockReturnValue({ isPending: false, isError: true, refetch });

		render(<CologMemberAside slug="rilog-team" />);

		expect(screen.getByRole('alert')).toHaveTextContent('멤버 목록을 불러오지 못했어요.');
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(refetch).toHaveBeenCalledOnce();
	});
});
