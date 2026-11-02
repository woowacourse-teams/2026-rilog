import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import type { AuthContextValue } from '@/features/auth/model/auth-context';

import InlineCommentInput from './InlineCommentInput';

interface ControlledInputProps {
	onSubmit?: () => void;
	isPending?: boolean;
	shouldAutoFocus?: boolean;
}

function ControlledInput({ onSubmit, isPending = false, shouldAutoFocus = false }: ControlledInputProps) {
	const [value, setValue] = useState('');
	return (
		<InlineCommentInput
			isOpen
			value={value}
			onChange={setValue}
			onSubmit={onSubmit}
			isPending={isPending}
			shouldAutoFocus={shouldAutoFocus}
		/>
	);
}

const renderInput = (auth: AuthContextValue) => (
	<AUTH_CONTEXT.Provider value={auth}>
		<ControlledInput />
	</AUTH_CONTEXT.Provider>
);

describe('InlineCommentInput', () => {
	it.each([
		{ isAuthenticated: false, sessionVersion: 0, isInitialized: true, isOnboarding: false },
		{ isAuthenticated: false, sessionVersion: 0, isInitialized: false, isOnboarding: false },
		{ isAuthenticated: true, sessionVersion: 0, isInitialized: false, isOnboarding: false },
		{ isAuthenticated: false, sessionVersion: 0, isInitialized: true, isOnboarding: true },
	])('회원 인증이 완료되지 않으면 댓글 입력을 렌더링하지 않는다: %j', (auth) => {
		render(renderInput(auth));
		expect(screen.queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '작성' })).not.toBeInTheDocument();
	});

	it('로그인하면 입력을 허용하고 작성 중 로그아웃하면 입력과 작성을 막는다', async () => {
		const user = userEvent.setup();
		const guest = { isAuthenticated: false, sessionVersion: 0, isInitialized: true, isOnboarding: false };
		const { rerender } = render(renderInput(guest));
		expect(screen.queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();

		rerender(renderInput({ ...guest, isAuthenticated: true }));
		const textarea = screen.getByRole('textbox', { name: '댓글 입력' });
		const button = screen.getByRole('button', { name: '작성' });
		expect(textarea).toBeEnabled();
		expect(button).toBeDisabled();
		await user.type(textarea, '  {Enter}');
		expect(button).toBeDisabled();
		await user.type(textarea, '댓글');
		expect(button).toBeEnabled();

		rerender(renderInput(guest));
		expect(screen.queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '작성' })).not.toBeInTheDocument();
	});
	it('공통 작성 영역에서 Enter로 줄을 바꾸고 별도 작성 버튼으로 제출한다', async () => {
		const user = userEvent.setup();
		const submit = vi.fn();
		render(
			<AUTH_CONTEXT.Provider
				value={{ isAuthenticated: true, sessionVersion: 0, isInitialized: true, isOnboarding: false }}
			>
				<ControlledInput onSubmit={submit} />
			</AUTH_CONTEXT.Provider>,
		);
		expect(screen.queryByRole('blockquote')).not.toBeInTheDocument();
		const field = within(screen.getByRole('group', { name: '댓글 입력 및 작성' }));
		const input = field.getByRole('textbox', { name: '댓글 입력' });
		const button = field.getByRole('button', { name: '작성' });
		expect(button).toBeDisabled();
		await user.type(input, '첫 줄{Enter}둘째 줄');
		expect(input).toHaveValue('첫 줄\n둘째 줄');
		expect(submit).not.toHaveBeenCalled();
		await user.click(button);
		expect(submit).toHaveBeenCalledOnce();
	});

	it('작성 진입은 입력에 포커스하고 요청 중에는 입력과 중복 제출을 막는다', async () => {
		const user = userEvent.setup();
		const submit = vi.fn();
		const view = (isPending: boolean) => (
			<AUTH_CONTEXT.Provider
				value={{ isAuthenticated: true, sessionVersion: 0, isInitialized: true, isOnboarding: false }}
			>
				<ControlledInput shouldAutoFocus isPending={isPending} onSubmit={submit} />
			</AUTH_CONTEXT.Provider>
		);
		const { rerender } = render(view(false));
		const input = screen.getByRole('textbox', { name: '댓글 입력' });
		expect(input).toHaveFocus();
		await user.type(input, '작성할 댓글');
		rerender(view(true));
		expect(input).toBeDisabled();
		const pending = screen.getByRole('button', { name: '작성 중…' });
		expect(pending).toBeDisabled();
		await user.click(pending);
		expect(submit).not.toHaveBeenCalled();
		expect(input).toHaveValue('작성할 댓글');
	});
});
