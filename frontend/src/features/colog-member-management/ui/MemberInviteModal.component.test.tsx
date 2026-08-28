import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readCologMembers } from '@/shared/api/cologs/api';
import { readUserBySlug } from '@/shared/api/users/api';

import MemberInviteModal from './MemberInviteModal';

vi.mock('@/shared/api/cologs/api');
vi.mock('@/shared/api/users/api');

const COLOG_SLUG = 'rilog-team';

describe('MemberInviteModal', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
		vi.mocked(readCologMembers).mockResolvedValue({
			status: 200,
			message: '팀 멤버 목록 조회에 성공했습니다.',
			data: [
				{
					id: 10,
					userId: 2,
					nickname: '기존 멤버',
					slug: 'existing-member',
					profileImageUrl: null,
					permission: 'MEMBER',
					blogRole: '',
					joinedAt: '2026-08-20T00:00:00',
				},
			],
		});
		vi.mocked(readUserBySlug).mockImplementation(({ slug }) => {
			if (slug === 'unknown') {
				return Promise.reject(new Error('Not found'));
			}

			return Promise.resolve({
				status: 200,
				message: '사용자 조회에 성공했습니다.',
				data: {
					id: 1,
					slug: 'jetproc',
					nickname: '김지연',
					profileImageUrl: '',
				},
			});
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
	});

	const renderWithProvider = (ui: React.ReactElement) =>
		render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

	it('고유 아이디 입력에 초기 focus를 주고 빈 상태를 표시한다', () => {
		renderWithProvider(<MemberInviteModal slug={COLOG_SLUG} open onClose={vi.fn()} />);

		const dialog = screen.getByRole('dialog', { name: '멤버 초대' });

		expect(dialog).toHaveAccessibleDescription('고유 아이디로 팀원을 초대합니다. 여러 명을 한 번에 추가할 수 있어요.');
		const input = screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' });
		expect(input).toHaveFocus();
		expect(input).toHaveAttribute('placeholder', '@user');
		expect(screen.getByText('추가할 멤버가 없습니다.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '초대' })).toBeDisabled();
	});

	it('Enter로 멤버를 추가하고 목록에서 제거한다', async () => {
		const user = userEvent.setup();
		renderWithProvider(<MemberInviteModal slug={COLOG_SLUG} open onClose={vi.fn()} />);

		const input = screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' });
		await user.type(input, '@jetproc{Enter}');

		expect(await screen.findByRole('list', { name: '추가할 멤버 정보' })).toHaveTextContent('김지연');
		expect(screen.getByRole('button', { name: '초대' })).toBeEnabled();

		await user.click(screen.getByRole('button', { name: '김지연 초대 목록에서 제거' }));
		expect(screen.getByText('추가할 멤버가 없습니다.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '초대' })).toBeDisabled();
	});

	it('존재하지 않거나 중복된 고유 아이디에 오류를 안내한다', async () => {
		const user = userEvent.setup();
		renderWithProvider(<MemberInviteModal slug={COLOG_SLUG} open onClose={vi.fn()} />);

		const input = screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' });

		// 없는 유저인 경우 (API 에러)
		await user.type(input, '@unknown{Enter}');
		expect(screen.getByText('해당 고유 아이디의 사용자를 찾을 수 없습니다.')).toBeInTheDocument();

		await user.clear(input);
		// 중복된 경우
		await user.type(input, '@jetproc{Enter}');
		await screen.findByRole('list', { name: '추가할 멤버 정보' });

		await user.type(input, '@jetproc{Enter}');
		expect(screen.getByText('이미 추가한 멤버입니다.')).toBeInTheDocument();
	});

	it('이미 팀에 등록된 멤버는 사용자 조회와 초대 후보 추가를 하지 않는다', async () => {
		const user = userEvent.setup();
		renderWithProvider(<MemberInviteModal slug={COLOG_SLUG} open onClose={vi.fn()} />);

		await waitFor(() => expect(readCologMembers).toHaveBeenCalledWith(COLOG_SLUG));
		await user.type(screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' }), '@existing-member{Enter}');

		expect(screen.getByText('이미 등록된 멤버입니다.')).toBeInTheDocument();
		expect(screen.getByText('추가할 멤버가 없습니다.')).toBeInTheDocument();
		expect(readUserBySlug).not.toHaveBeenCalled();
	});

	it('추가한 멤버를 전달하고 모달을 닫는다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onInvite = vi.fn();
		renderWithProvider(<MemberInviteModal slug={COLOG_SLUG} open onClose={onClose} onInvite={onInvite} />);

		await user.type(screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' }), '@jetproc{Enter}');
		await screen.findByRole('list', { name: '추가할 멤버 정보' });

		await user.click(screen.getByRole('button', { name: '초대' }));

		expect(onInvite).toHaveBeenCalledWith([
			{
				userId: 1,
				slug: 'jetproc',
				nickname: '김지연',
				profileImageUrl: '',
			},
		]);
		expect(onClose).toHaveBeenCalledOnce();
	});
});
