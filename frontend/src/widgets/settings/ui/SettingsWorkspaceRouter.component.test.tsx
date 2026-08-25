import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SettingsWorkspaceRouter from './SettingsWorkspaceRouter';

const { useBlogPublicProfileQueryMock } = vi.hoisted(() => ({
	useBlogPublicProfileQueryMock: vi.fn(),
}));

vi.mock('@/shared/api/blogs/queries/public-profile/use-query', () => ({
	useBlogPublicProfileQuery: useBlogPublicProfileQueryMock,
}));
vi.mock('@/features/colog-settings-access/ui/CologSettingsAccessGuard', () => ({
	default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/features/rilog-settings-access/ui/RilogSettingsAccessGuard', () => ({
	default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/widgets/colog-settings/ui/CologSettingsWorkspace', () => ({
	default: ({ initialTab }: { initialTab: string }) => <div>Co-log 설정: {initialTab}</div>,
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
			data: { data: { type: 'RILOG' } },
			isError: false,
			isPending: false,
		});

		render(<SettingsWorkspaceRouter slug="rilogger" tab="danger" />);

		expect(screen.getByText('Rilog 설정: danger')).toBeInTheDocument();
		expect(screen.queryByText(/Co-log 설정/)).not.toBeInTheDocument();
	});

	it('Co-log 프로필은 Co-log 설정 워크스페이스로 연결한다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: { data: { type: 'COLOG' } },
			isError: false,
			isPending: false,
		});

		render(<SettingsWorkspaceRouter slug="rilog" tab="members" />);

		expect(screen.getByText('Co-log 설정: members')).toBeInTheDocument();
		expect(screen.queryByText(/Rilog 설정/)).not.toBeInTheDocument();
	});

	it('지원하지 않는 프로필 타입을 Co-log로 처리하지 않는다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: { data: { type: 'UNKNOWN' } },
			isError: false,
			isPending: false,
		});

		render(<SettingsWorkspaceRouter slug="unknown" />);

		expect(screen.getByRole('alert')).toHaveTextContent('설정 정보를 불러오지 못했습니다.');
		expect(screen.queryByText(/Co-log 설정/)).not.toBeInTheDocument();
	});
});
