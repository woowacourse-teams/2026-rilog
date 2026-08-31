import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as availabilityApi from '@/shared/api/availability/api';
import * as blogsApi from '@/shared/api/blogs/api';
import { renderWithQuery } from '@/test/render-with-query';

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
		vi.restoreAllMocks();
		refetchMock.mockReset();
		useBlogPublicProfileQueryMock.mockReset();
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: initialProfile,
			isError: false,
			isPending: false,
			refetch: refetchMock,
		});
		vi.spyOn(availabilityApi, 'checkNicknameAvailability').mockResolvedValue({
			status: 200,
			message: '사용 가능한 닉네임입니다.',
			data: null,
		});
		vi.spyOn(blogsApi, 'updateBlogProfile').mockResolvedValue({
			status: 200,
			message: '개인 프로필을 수정했습니다.',
		});
	});

	it('프로필과 위험 영역을 탭·키보드로 전환하고 URL에 반영한다', async () => {
		const user = userEvent.setup();
		renderWithQuery(<RilogSettingsWorkspace slug="rilogger" />);

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

	it('시리즈 관리에서 시리즈를 추가하고 이름을 수정한다', async () => {
		const user = userEvent.setup();
		renderWithQuery(<RilogSettingsWorkspace slug="rilogger" />);

		await user.click(screen.getByRole('tab', { name: '시리즈 관리' }));
		expect(screen.getByRole('table', { name: '시리즈 목록' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '+ 시리즈 추가' }));
		await user.type(screen.getByRole('textbox', { name: '시리즈 이름' }), '회고');
		await user.click(screen.getByRole('button', { name: '추가' }));
		expect(screen.getByText('회고')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '시리즈 수정' }));
		const seriesName = screen.getByRole('textbox', { name: '웹 개발 시리즈 이름' });
		await user.clear(seriesName);
		await user.type(seriesName, '프론트엔드');
		await user.click(screen.getByRole('button', { name: '저장' }));

		await waitFor(() => expect(screen.getByText('프론트엔드')).toBeInTheDocument());
	});

	it('저장하지 않은 프로필은 탭 이동을 확인하고 취소하면 유지한다', async () => {
		const user = userEvent.setup();
		renderWithQuery(<RilogSettingsWorkspace slug="rilogger" />);

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
		renderWithQuery(<RilogSettingsWorkspace slug="rilogger" />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '새 리로거');
		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await waitFor(() => expect(nickname).toHaveAccessibleDescription(/사용 가능한 닉네임입니다\./));
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));
		await waitFor(() => expect(screen.queryByRole('button', { name: '변경사항 저장' })).not.toBeInTheDocument());
		expect(blogsApi.updateBlogProfile).toHaveBeenCalledWith('rilogger', {
			name: '새 리로거',
			profileImageUrl: null,
			coverImageUrl: null,
			introduction: '조회된 소개',
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/rilog',
		});

		await user.click(screen.getByRole('tab', { name: '위험 영역' }));
		expect(screen.queryByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('tab', { name: '프로필' }));
		expect(screen.getByRole('textbox', { name: '닉네임' })).toHaveValue('새 리로거');
	});

	it('프로필 조회 중에는 로딩 상태를 표시한다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({ isPending: true });

		renderWithQuery(<RilogSettingsWorkspace slug="rilogger" />);

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

		renderWithQuery(<RilogSettingsWorkspace slug="rilogger" />);

		expect(screen.getByRole('alert')).toHaveTextContent('개인 프로필을 불러오지 못했어요.');
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(refetchMock).toHaveBeenCalledOnce();
	});

	it('닉네임을 변경하면 중복 확인 전에는 저장하지 않는다', async () => {
		const user = userEvent.setup();
		renderWithQuery(<RilogSettingsWorkspace slug="rilogger" />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '새 리로거');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		expect(nickname).toHaveFocus();
		expect(nickname).toHaveAccessibleDescription(/닉네임 중복 확인이 필요합니다\./);
		expect(blogsApi.updateBlogProfile).not.toHaveBeenCalled();
	});

	it('프로필 저장 실패를 폼 하단에 안내한다', async () => {
		const user = userEvent.setup();
		vi.mocked(blogsApi.updateBlogProfile).mockRejectedValueOnce(new Error('프로필 수정 실패'));
		renderWithQuery(<RilogSettingsWorkspace slug="rilogger" />);

		const description = screen.getByRole('textbox', { name: '한 줄 소개' });
		await user.clear(description);
		await user.type(description, '새 소개');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('프로필 수정 실패');
	});
});
