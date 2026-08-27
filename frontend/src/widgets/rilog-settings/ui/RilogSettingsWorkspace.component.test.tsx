import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RilogSettingsWorkspace from './RilogSettingsWorkspace';

const { refetchMock, replaceMock, useBlogPublicProfileQueryMock } = vi.hoisted(() => ({
	refetchMock: vi.fn(),
	replaceMock: vi.fn(),
	useBlogPublicProfileQueryMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/shared/api/blogs/queries/public-profile/use-query', () => ({
	useBlogPublicProfileQuery: useBlogPublicProfileQueryMock,
}));

const initialProfile = {
	nickname: '조회된 리로거',
	slug: 'rilogger',
	description: '조회된 소개',
	profileImageUrl: '',
	serviceUrl: 'https://rilog.kr',
	githubUrl: 'https://github.com/rilog',
	profileImageFile: null,
};

describe('RilogSettingsWorkspace', () => {
	beforeEach(() => {
		refetchMock.mockReset();
		useBlogPublicProfileQueryMock.mockReset();
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: initialProfile,
			isError: false,
			isPending: false,
			refetch: refetchMock,
		});
	});

	it('프로필과 위험 영역을 탭·키보드로 전환하고 URL에 반영한다', async () => {
		const user = userEvent.setup();
		render(<RilogSettingsWorkspace slug="rilogger" />);

		expect(screen.getByRole('textbox', { name: '닉네임' })).toHaveValue('조회된 리로거');

		const profileTab = screen.getByRole('tab', { name: '프로필' });
		expect(profileTab).toHaveAttribute('aria-selected', 'true');
		profileTab.focus();
		await user.keyboard('{End}');

		expect(screen.getByRole('tab', { name: '위험 영역' })).toHaveFocus();
		expect(screen.getByRole('heading', { name: '위험 영역' })).toBeInTheDocument();
		expect(window.location.pathname + window.location.search).toBe('/@rilogger/settings?tab=danger');
		expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'rilog-settings-tab-danger');
	});

	it('저장하지 않은 프로필은 탭 이동을 확인하고 취소하면 유지한다', async () => {
		const user = userEvent.setup();
		render(<RilogSettingsWorkspace slug="rilogger" />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '수정 중인 리로거');
		await user.click(screen.getByRole('tab', { name: '위험 영역' }));

		const dialog = screen.getByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' });
		await user.click(within(dialog).getByRole('button', { name: '계속 수정' }));
		expect(screen.getByRole('textbox', { name: '닉네임' })).toHaveValue('수정 중인 리로거');
	});

	it('저장한 프로필은 확인 없이 탭을 이동하고 현재 세션의 값을 유지한다', async () => {
		const user = userEvent.setup();
		render(<RilogSettingsWorkspace slug="rilogger" />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '새 리로거');
		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));
		await waitFor(() => expect(screen.queryByRole('button', { name: '변경사항 저장' })).not.toBeInTheDocument());

		await user.click(screen.getByRole('tab', { name: '위험 영역' }));
		expect(screen.queryByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('tab', { name: '프로필' }));
		expect(screen.getByRole('textbox', { name: '닉네임' })).toHaveValue('새 리로거');
	});

	it('프로필 조회 중에는 로딩 상태를 표시한다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({ isPending: true });

		render(<RilogSettingsWorkspace slug="rilogger" />);

		expect(screen.getByRole('status')).toHaveTextContent('개인 프로필을 불러오는 중...');
	});

	it('프로필 조회 실패를 안내하고 다시 시도한다', async () => {
		const user = userEvent.setup();
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: undefined,
			isError: true,
			isPending: false,
			refetch: refetchMock,
		});

		render(<RilogSettingsWorkspace slug="rilogger" />);

		expect(screen.getByRole('alert')).toHaveTextContent('개인 프로필을 불러오지 못했어요.');
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(refetchMock).toHaveBeenCalledOnce();
	});
});
