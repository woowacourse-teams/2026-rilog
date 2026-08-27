import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CologProfileSettingsValue } from '@/features/colog-profile-management/model/colog-profile-settings';
import { checkNicknameAvailability } from '@/shared/api/availability/api';
import { renderWithQuery as render } from '@/test/render-with-query';

import CologSettingsWorkspace from './CologSettingsWorkspace';

const {
	cologProfileUpdatedMock,
	mutateAsyncMock,
	refetchProfileMock,
	replaceMock,
	resetSaveProfileMock,
	useBlogPublicProfileQueryMock,
	useCologMembersQueryMock,
	useSaveCologProfileMock,
} = vi.hoisted(() => ({
	cologProfileUpdatedMock: vi.fn(),
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

vi.mock('@/shared/api/availability/api');

vi.mock('@/features/analytics/model/events', () => ({ analytics: { cologProfileUpdated: cologProfileUpdatedMock } }));

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
		cologProfileUpdatedMock.mockReset();
		refetchProfileMock.mockClear();
		replaceMock.mockClear();
		resetSaveProfileMock.mockClear();
		useBlogPublicProfileQueryMock.mockReset();
		useCologMembersQueryMock.mockReset();
		useSaveCologProfileMock.mockReset();
		vi.mocked(checkNicknameAvailability).mockReset();
		vi.mocked(checkNicknameAvailability).mockResolvedValue({
			status: 200,
			message: '사용가능한 닉네임입니다.',
			data: null,
		});
		mutateAsyncMock.mockImplementation(({ value }: { value: CologProfileSettingsValue }) =>
			Promise.resolve({
				...value,
				logoFile: null,
				coverImageFile: null,
			}),
		);
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

		expect(useBlogPublicProfileQueryMock).toHaveBeenCalledOnce();
		const [queryOptions] = useBlogPublicProfileQueryMock.mock.calls[0] as [{ slug: string; select: unknown }];
		expect(queryOptions.slug).toBe('team-rilog');
		expect(queryOptions.select).toBeTypeOf('function');
		expect(screen.getByRole('tab', { name: '프로필' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('heading', { name: '프로필' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveValue('API 리로그');
		expect(screen.getByRole('button', { name: '팀 이름 중복 확인' })).toBeInTheDocument();
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
		expect(screen.queryByRole('table', { name: '팀 멤버 목록' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '변경사항 저장' })).not.toBeInTheDocument();
	});

	it('프로필 변경사항이 생기면 저장 버튼을 표시한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" />);

		await user.clear(screen.getByRole('textbox', { name: '팀 이름' }));
		await user.type(screen.getByRole('textbox', { name: '팀 이름' }), '새 리로그');

		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeEnabled();
	});

	it('변경한 팀 이름을 중복 확인하고 다시 바꾸면 확인 상태를 초기화한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" />);

		const name = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(name);
		await user.type(name, '  새 리로그  ');
		await user.click(screen.getByRole('button', { name: '팀 이름 중복 확인' }));

		await waitFor(() => expect(checkNicknameAvailability).toHaveBeenCalledWith({ nickname: '새 리로그' }));
		expect(name).toHaveValue('새 리로그');
		expect(name).toHaveAccessibleDescription(/사용가능한 닉네임입니다\./);

		await user.type(name, '2');
		expect(name).not.toHaveAccessibleDescription(/사용가능한 닉네임입니다\./);
	});

	it('변경한 팀 이름을 중복 확인하지 않으면 저장하지 않고 이름 입력에 안내한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" />);

		const name = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(name);
		await user.type(name, '새 리로그');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		expect(mutateAsyncMock).not.toHaveBeenCalled();
		expect(name).toHaveAccessibleDescription(/팀 이름 중복 확인이 필요합니다\./);
		expect(name).toHaveFocus();
	});

	it('팀 이름이 그대로면 다른 프로필 변경은 이름 중복 확인 없이 저장한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" />);

		const description = screen.getByRole('textbox', { name: '팀 소개' });
		await user.clear(description);
		await user.type(description, '새로운 팀 소개');
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

		await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledOnce());
		expect(cologProfileUpdatedMock).toHaveBeenCalledWith({ changedFields: ['introduction'] });
		expect(checkNicknameAvailability).not.toHaveBeenCalled();
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
		render(<CologSettingsWorkspace slug="team-rilog" />);

		await user.click(screen.getByRole('tab', { name: '멤버 관리' }));

		expect(screen.getByRole('tab', { name: '멤버 관리' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('heading', { name: '멤버 관리' })).toBeInTheDocument();
		expect(screen.getByRole('table', { name: '팀 멤버 목록' })).toBeInTheDocument();
	});

	it('프로필, 멤버 관리, 위험 영역을 같은 설정 패널 위치에서 전환한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" />);

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
		render(<CologSettingsWorkspace slug="team-rilog" />);

		const profileTab = screen.getByRole('tab', { name: '프로필' });
		profileTab.focus();
		await user.keyboard('{ArrowRight}');

		expect(screen.getByRole('tab', { name: '멤버 관리' })).toHaveFocus();
		expect(screen.getByRole('heading', { name: '멤버 관리' })).toBeInTheDocument();
	});

	it('프로필을 저장하면 확인 없이 다른 탭으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" />);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '새 리로그');
		await user.click(screen.getByRole('button', { name: '팀 이름 중복 확인' }));
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));
		await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledOnce());
		const [profileMutation] = mutateAsyncMock.mock.calls[0] as [{ slug: string; value: CologProfileSettingsValue }];
		expect(profileMutation.slug).toBe('team-rilog');
		expect(profileMutation.value.name).toBe('새 리로그');
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
		render(<CologSettingsWorkspace slug="team-rilog" />);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '새 리로그');

		expect(screen.getByRole('alert')).toHaveTextContent('저장 요청 실패');
		expect(nameInput).toHaveValue('새 리로그');
		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeEnabled();
	});

	it('저장하지 않은 프로필은 탭 이동을 확인하고 취소하면 유지한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" />);

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
		render(<CologSettingsWorkspace slug="team-rilog" />);

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
				<Link href="/@rilog">팀으로 돌아가기</Link>
				<CologSettingsWorkspace slug="team-rilog" />
			</>,
		);

		const nameInput = screen.getByRole('textbox', { name: '팀 이름' });
		await user.clear(nameInput);
		await user.type(nameInput, '수정 중인 리로그');
		await user.click(screen.getByRole('link', { name: '팀으로 돌아가기' }));

		expect(screen.getByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: '이동' }));
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/@rilog'));
	});

	it('수정 사항이 있을 때만 beforeunload 기본 경고를 요청한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace slug="team-rilog" />);

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
		render(<CologSettingsWorkspace slug="team-rilog" />);

		await user.click(screen.getByRole('tab', { name: '멤버 관리' }));
		await user.click(screen.getByRole('button', { name: '+ 멤버 초대' }));

		expect(useCologMembersQueryMock).toHaveBeenCalledWith({ slug: 'team-rilog' });
		expect(screen.getByRole('dialog', { name: '멤버 초대' })).toBeInTheDocument();
		const input = screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' });
		expect(input).toHaveFocus();
		expect(input).toHaveAttribute('placeholder', '@user');
	});
});
