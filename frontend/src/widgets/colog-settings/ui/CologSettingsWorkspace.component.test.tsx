import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CologProfileSettingsValue } from '@/features/colog-profile-management/model/colog-profile-settings';
import { renderWithQuery as render } from '@/test/render-with-query';

import CologSettingsWorkspace from './CologSettingsWorkspace';

const {
	mutateAsyncMock,
	refetchProfileMock,
	replaceMock,
	resetSaveProfileMock,
	useBlogPublicProfileQueryMock,
	useCologMembersQueryMock,
	useSaveCologProfileMock,
} = vi.hoisted(() => ({
	mutateAsyncMock: vi.fn(),
	refetchProfileMock: vi.fn(),
	replaceMock: vi.fn(),
	resetSaveProfileMock: vi.fn(),
	useBlogPublicProfileQueryMock: vi.fn(),
	useCologMembersQueryMock: vi.fn(),
	useSaveCologProfileMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/shared/api/blogs/queries/public-profile/use-query', () => ({
	useBlogPublicProfileQuery: useBlogPublicProfileQueryMock,
}));

vi.mock('@/shared/api/cologs/queries/members/use-query', () => ({
	useCologMembersQuery: useCologMembersQueryMock,
}));

vi.mock('@/features/colog-profile-management/hooks/use-save-colog-profile', () => ({
	useSaveCologProfile: useSaveCologProfileMock,
}));

const PROFILE_SETTINGS: CologProfileSettingsValue = {
	name: 'API 리로그',
	slug: 'team-rilog',
	description: 'API에서 조회한 팀 소개',
	profileImageUrl: 'https://example.com/profile.png',
	coverImageUrl: 'https://example.com/cover.png',
	serviceUrl: 'https://rilog.example.com',
	githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
	logoFile: null,
	coverImageFile: null,
};

describe('CologSettingsWorkspace', () => {
	beforeEach(() => {
		mutateAsyncMock.mockReset();
		refetchProfileMock.mockClear();
		replaceMock.mockClear();
		resetSaveProfileMock.mockClear();
		useBlogPublicProfileQueryMock.mockReset();
		useCologMembersQueryMock.mockReset();
		useSaveCologProfileMock.mockReset();
		mutateAsyncMock.mockImplementation(({ value }: { value: CologProfileSettingsValue }) => ({
			...value,
			logoFile: null,
			coverImageFile: null,
		}));
		useSaveCologProfileMock.mockReturnValue({
			error: null,
			isError: false,
			isPending: false,
			mutateAsync: mutateAsyncMock,
			reset: resetSaveProfileMock,
		});
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: PROFILE_SETTINGS,
			isError: false,
			isPending: false,
			refetch: refetchProfileMock,
		});
		useCologMembersQueryMock.mockReturnValue({
			data: { status: 200, message: '팀 멤버 목록 조회에 성공했습니다.', data: [] },
		});
		window.history.replaceState(null, '', '/');
	});

	it('조회한 코로그 프로필을 폼 초기값으로 표시한다', () => {
		render(<CologSettingsWorkspace slug="team-rilog" />);

		expect(useBlogPublicProfileQueryMock).toHaveBeenCalledWith({
			slug: 'team-rilog',
			select: expect.any(Function) as unknown,
		});
		expect(screen.getByRole('tab', { name: '프로필' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('heading', { name: '프로필' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveValue('API 리로그');
		for (const label of ['팀 이름', '팀 고유 아이디']) {
			const fieldLabel = screen.getByText(label).closest('label')!;
			expect(within(fieldLabel).getByText('*')).toHaveClass('text-danger');
		}
		expect(within(screen.getByText('팀 로고').closest('label')!).queryByText('*')).not.toBeInTheDocument();
		const slugInput = screen.getByRole('textbox', { name: '팀 고유 아이디' });
		expect(slugInput).toHaveValue('team-rilog');
		expect(slugInput).toBeDisabled();
		expect(slugInput).toHaveAccessibleDescription('팀 고유 아이디는 변경할 수 없습니다.');
		expect(screen.getByText('rilog.kr/@')).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '팀 소개' })).toHaveValue('API에서 조회한 팀 소개');
		expect(screen.getByLabelText('팀 로고 변경')).not.toBeRequired();
		expect(screen.getByRole('textbox', { name: '팀 소개' })).not.toBeRequired();
		expect(screen.getByRole('group', { name: '소셜' })).toHaveAccessibleDescription('링크를 통해 팀을 표현해 보세요.');
		expect(screen.queryByText('(선택)')).not.toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '서비스 링크' })).not.toBeRequired();
		expect(screen.getByRole('textbox', { name: 'GitHub 링크' })).not.toBeRequired();
		expect(screen.getByRole('textbox', { name: '서비스 링크' }).parentElement?.querySelector('img')).toHaveAttribute(
			'src',
			'/icons/form/link.svg',
		);
		expect(screen.getByRole('textbox', { name: 'GitHub 링크' }).parentElement?.querySelector('img')).toHaveAttribute(
			'src',
			'/icons/form/github.svg',
		);
		expect(screen.queryByRole('table', { name: '코로그 멤버 목록' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '변경사항 저장' })).not.toBeInTheDocument();
	});

	it('프로필 변경사항이 생기면 저장 버튼을 표시한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.clear(screen.getByRole('textbox', { name: '팀 이름' }));
		await user.type(screen.getByRole('textbox', { name: '팀 이름' }), '새 리로그');

		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeEnabled();
	});

	it('코로그 프로필 조회 중에는 로딩 상태를 표시한다', () => {
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: undefined,
			isError: false,
			isPending: true,
			refetch: refetchProfileMock,
		});

		render(<CologSettingsWorkspace slug="team-rilog" />);

		expect(screen.getByRole('status')).toHaveTextContent('팀 프로필을 불러오는 중...');
		expect(screen.queryByRole('textbox', { name: '팀 이름' })).not.toBeInTheDocument();
	});

	it('코로그 프로필 조회 실패를 알리고 다시 요청한다', async () => {
		const user = userEvent.setup();
		useBlogPublicProfileQueryMock.mockReturnValue({
			data: undefined,
			isError: true,
			isPending: false,
			refetch: refetchProfileMock,
		});

		render(<CologSettingsWorkspace slug="team-rilog" />);

		expect(screen.getByRole('alert')).toHaveTextContent('팀 프로필을 불러오지 못했어요.');
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(refetchProfileMock).toHaveBeenCalledOnce();
	});

	it('URL로 선택한 탭을 표시하고 탭 변경을 query에 반영한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" initialTab="members" />);

		expect(screen.getByRole('tab', { name: '멤버 관리' })).toHaveAttribute('aria-selected', 'true');
		await user.click(screen.getByRole('tab', { name: '위험 영역' }));

		expect(window.location.pathname + window.location.search).toBe('/@team-rilog/settings?tab=danger');
	});

	it('탭을 선택하면 해당 설정 내용을 조건부 렌더링한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('tab', { name: '멤버 관리' }));

		expect(screen.getByRole('tab', { name: '멤버 관리' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('heading', { name: '멤버 관리' })).toBeInTheDocument();
		expect(screen.getByRole('table', { name: '코로그 멤버 목록' })).toBeInTheDocument();
	});

	it('프로필, 멤버 관리, 위험 영역을 같은 설정 패널 위치에서 전환한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		const profileTab = screen.getByRole('tab', { name: '프로필' });
		const memberTab = screen.getByRole('tab', { name: '멤버 관리' });

		expect(screen.getByRole('tabpanel')).toHaveAttribute('id', profileTab.getAttribute('aria-controls'));
		expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', profileTab.id);

		await user.click(memberTab);
		expect(screen.getByRole('tabpanel')).toHaveAttribute('id', memberTab.getAttribute('aria-controls'));
		expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', memberTab.id);
		expect(screen.getByRole('heading', { name: '멤버 관리' })).toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: '위험 영역' }));
		const activeDangerTab = screen.getByRole('tab', { name: '위험 영역' });
		expect(screen.getByRole('tabpanel')).toHaveAttribute('id', activeDangerTab.getAttribute('aria-controls'));
		expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', activeDangerTab.id);
		expect(screen.getByRole('heading', { name: '위험 영역' })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: '프로필' })).not.toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: '멤버 관리' })).not.toBeInTheDocument();
	});

	it('방향키로 다음 탭에 이동한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		const profileTab = screen.getByRole('tab', { name: '프로필' });
		profileTab.focus();
		await user.keyboard('{ArrowRight}');

		expect(screen.getByRole('tab', { name: '멤버 관리' })).toHaveFocus();
		expect(screen.getByRole('heading', { name: '멤버 관리' })).toBeInTheDocument();
	});

	it('프로필을 저장하면 확인 없이 다른 탭으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '새 리로그');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));
		await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledOnce());
		const [[mutation]] = mutateAsyncMock.mock.calls as unknown as [
			[{ slug: string; value: CologProfileSettingsValue }],
		];
		expect(mutation.slug).toBe('rilog');
		expect(mutation.value.name).toBe('새 리로그');
		await waitFor(() => expect(screen.queryByRole('button', { name: '변경사항 저장' })).not.toBeInTheDocument());
		await user.click(screen.getByRole('tab', { name: '멤버 관리' }));

		expect(screen.getByRole('heading', { name: '멤버 관리' })).toBeInTheDocument();
		expect(screen.queryByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: '프로필' }));
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveValue('새 리로그');
	});

	it('프로필 저장 실패 상태에서는 입력값과 저장 버튼을 유지하고 오류를 표시한다', async () => {
		const user = userEvent.setup();
		useSaveCologProfileMock.mockReturnValue({
			error: new Error('저장 요청 실패'),
			isError: true,
			isPending: false,
			mutateAsync: mutateAsyncMock,
			reset: resetSaveProfileMock,
		});
		render(<CologSettingsWorkspace />);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '새 리로그');

		expect(screen.getByRole('alert')).toHaveTextContent('저장 요청 실패');
		expect(nameInput).toHaveValue('새 리로그');
		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeEnabled();
	});

	it('저장하지 않은 프로필은 탭 이동을 확인하고 취소하면 유지한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '수정 중인 리로그');
		await user.click(screen.getByRole('tab', { name: '멤버 관리' }));

		const leaveDialog = screen.getByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' });
		expect(leaveDialog).toHaveAccessibleDescription('수정 중인 설정은 저장되지 않습니다.');
		await user.click(within(leaveDialog).getByRole('button', { name: '계속 수정' }));

		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveValue('수정 중인 리로그');
	});

	it('이동을 확인하면 프로필의 미저장 상태를 폐기한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '수정 중인 리로그');
		await user.click(screen.getByRole('tab', { name: '멤버 관리' }));
		await user.click(screen.getByRole('button', { name: '이동' }));
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).not.toBeInTheDocument(),
		);

		await user.click(screen.getByRole('tab', { name: '프로필' }));
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveValue('API 리로그');

		await user.click(screen.getByRole('tab', { name: '위험 영역' }));
		expect(screen.queryByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).not.toBeInTheDocument();
	});

	it('수정 사항이 있으면 내부 페이지 이동을 확인한다', async () => {
		const user = userEvent.setup();
		render(
			<>
				<Link href="/@rilog">코로그로 돌아가기</Link>
				<CologSettingsWorkspace />
			</>,
		);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '수정 중인 리로그');
		await user.click(screen.getByRole('link', { name: '코로그로 돌아가기' }));

		expect(screen.getByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: '이동' }));
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/@rilog'));
	});

	it('수정 사항이 있을 때만 beforeunload 기본 경고를 요청한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '수정 중인 리로그');

		const dirtyBeforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(dirtyBeforeUnloadEvent);
		expect(dirtyBeforeUnloadEvent.defaultPrevented).toBe(true);

		await user.clear(nameInput);
		await user.type(nameInput, 'API 리로그');
		const cleanBeforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(cleanBeforeUnloadEvent);
		expect(cleanBeforeUnloadEvent.defaultPrevented).toBe(false);
	});

	it('멤버 초대 버튼으로 초대 모달을 연다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('tab', { name: '멤버 관리' }));
		await user.click(screen.getByRole('button', { name: '+ 멤버 초대' }));

		expect(useCologMembersQueryMock).toHaveBeenCalledWith({ slug: 'rilog' });
		expect(screen.getByRole('dialog', { name: '멤버 초대' })).toBeInTheDocument();
		const input = screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' });
		expect(input).toHaveFocus();
		expect(input).toHaveAttribute('placeholder', '@user');
	});
});
