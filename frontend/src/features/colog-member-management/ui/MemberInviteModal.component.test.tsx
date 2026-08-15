import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MemberInviteModal from './MemberInviteModal';

describe('MemberInviteModal', () => {
	it('고유 아이디 입력에 초기 focus를 주고 빈 상태를 표시한다', () => {
		render(<MemberInviteModal open onClose={vi.fn()} />);

		const dialog = screen.getByRole('dialog', { name: '멤버 초대' });

		expect(dialog).toHaveAccessibleDescription('고유 아이디로 팀원을 초대합니다. 여러 명을 한 번에 추가할 수 있어요.');
		expect(screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' })).toHaveFocus();
		expect(screen.getByText('추가할 멤버가 없습니다.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '초대' })).toBeDisabled();
	});

	it('Enter로 멤버를 추가하고 목록에서 제거한다', async () => {
		const user = userEvent.setup();
		render(<MemberInviteModal open onClose={vi.fn()} />);

		const input = screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' });
		await user.type(input, '@jetproc{Enter}');

		expect(screen.getByRole('list', { name: '추가할 멤버 정보' })).toHaveTextContent('김지연');
		expect(screen.getByRole('button', { name: '초대' })).toBeEnabled();

		await user.click(screen.getByRole('button', { name: '김지연 초대 목록에서 제거' }));
		expect(screen.getByText('추가할 멤버가 없습니다.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '초대' })).toBeDisabled();
	});

	it('존재하지 않거나 중복된 고유 아이디에 오류를 안내한다', async () => {
		const user = userEvent.setup();
		render(<MemberInviteModal open onClose={vi.fn()} />);

		const input = screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' });
		await user.type(input, '@unknown{Enter}');
		expect(screen.getByText('해당 고유 아이디의 사용자를 찾을 수 없습니다.')).toBeInTheDocument();

		await user.clear(input);
		await user.type(input, '@jetproc{Enter}@jetproc{Enter}');
		expect(screen.getByText('이미 추가한 멤버입니다.')).toBeInTheDocument();
	});

	it('추가한 멤버를 전달하고 모달을 닫는다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onInvite = vi.fn();
		render(<MemberInviteModal open onClose={onClose} onInvite={onInvite} />);

		await user.type(screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' }), '@jetproc{Enter}');
		await user.click(screen.getByRole('button', { name: '초대' }));

		expect(onInvite).toHaveBeenCalledWith([
			{
				slug: 'jetproc',
				nickname: '김지연',
				profileImageUrl: '',
			},
		]);
		expect(onClose).toHaveBeenCalledOnce();
	});
});
