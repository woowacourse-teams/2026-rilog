import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SettingsWorkspaceRouter from './SettingsWorkspaceRouter';

const { useBlogPublicProfileQueryMock } = vi.hoisted(() => ({
	useBlogPublicProfileQueryMock: vi.fn(),
}));

vi.mock('@/shared/api/blogs/queries/public-profile/use-query', () => ({
	useBlogPublicProfileQuery: useBlogPublicProfileQueryMock,
}));
vi.mock('@/features/settings-access/ui/SettingsAccessGuard', () => ({
	default: ({ children, type, slug }: { children: React.ReactNode; type: string; slug: string }) => (
		<div aria-label={`${type} ${slug} 설정 접근 가드`}>{children}</div>
	),
}));
vi.mock('@/widgets/colog-settings/ui/CologSettingsWorkspace', () => ({
	default: ({
		initialTab,
		isMemberInviteInitiallyOpen,
	}: {
		initialTab: string;
		isMemberInviteInitiallyOpen: boolean;
	}) => <div data-member-invite-open={isMemberInviteInitiallyOpen}>Colog 설정: {initialTab}</div>,
}));
vi.mock('@/widgets/rilog-settings/ui/RilogSettingsWorkspace', () => ({
	default: ({ initialTab }: { initialTab: string }) => <div>Rilog 설정: {initialTab}</div>,
}));

describe('SettingsWorkspaceRouter', () => {
	beforeEach(() => {
		useBlogPublicProfileQueryMock.mockReset();
	});

	it('Rilog 프로필은 Rilog 설정 워크스페이스로 연결한다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: {
				data: {
					type: 'RILOG',
					id: 1,
					name: '조회된 리로거',
					slug: 'rilogger',
					introduction: null,
					profileImageUrl: null,
					coverImageUrl: null,
					serviceUrl: null,
					githubUrl: null,
					memberCount: 1,
					postCount: 0,
				},
			},
			isError: false,
			isPending: false,
		});

		render(<SettingsWorkspaceRouter slug="rilogger" tab="danger" />);

		expect(screen.getByRole('generic', { name: 'RILOG rilogger 설정 접근 가드' })).toBeInTheDocument();
		expect(screen.getByText('Rilog 설정: danger')).toBeInTheDocument();
		expect(screen.queryByText(/Colog 설정/)).not.toBeInTheDocument();
	});

	it('Co-log 프로필은 Co-log 설정 워크스페이스로 연결한다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: { data: { type: 'COLOG' } },
			isError: false,
			isPending: false,
		});

		render(<SettingsWorkspaceRouter slug="rilog" tab="members" />);

		expect(screen.getByRole('generic', { name: 'COLOG rilog 설정 접근 가드' })).toBeInTheDocument();
		expect(screen.getByText('Colog 설정: members')).toBeInTheDocument();
		expect(screen.queryByText(/Rilog 설정/)).not.toBeInTheDocument();
	});

	it('members 탭의 invite=true를 멤버 초대 모달 초기 상태로 전달한다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: { data: { type: 'COLOG' } },
			isError: false,
			isPending: false,
		});

		render(<SettingsWorkspaceRouter slug="rilog" tab="members" invite="true" />);

		expect(screen.getByText('Colog 설정: members')).toHaveAttribute('data-member-invite-open', 'true');
	});

	it('지원하지 않는 프로필 타입을 Co-log로 처리하지 않는다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: { data: { type: 'UNKNOWN' } },
			isError: false,
			isPending: false,
		});

		render(<SettingsWorkspaceRouter slug="unknown" />);

		expect(screen.getByRole('alert')).toHaveTextContent('설정 정보를 불러오지 못했습니다.');
		expect(screen.queryByText(/Colog 설정/)).not.toBeInTheDocument();
	});
});
