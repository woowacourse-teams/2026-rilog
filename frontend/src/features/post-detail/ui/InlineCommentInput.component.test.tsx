import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import type { AuthContextValue } from '@/features/auth/model/auth-context';

import InlineCommentInput from './InlineCommentInput';

const renderInput = (auth: AuthContextValue) => (
	<AUTH_CONTEXT.Provider value={auth}>
		<InlineCommentInput isOpen />
	</AUTH_CONTEXT.Provider>
);

describe('InlineCommentInput', () => {
	it.each([
		{ isAuthenticated: false, isInitialized: true, isOnboarding: false },
		{ isAuthenticated: false, isInitialized: false, isOnboarding: false },
		{ isAuthenticated: true, isInitialized: false, isOnboarding: false },
		{ isAuthenticated: false, isInitialized: true, isOnboarding: true },
	])('회원 인증이 완료되지 않으면 입력과 작성을 막는다: %j', async (auth) => {
		const user = userEvent.setup();
		render(renderInput(auth));
		const textarea = screen.getByRole('textbox', { name: '댓글 입력' });

		expect(textarea).toBeDisabled();
		expect(textarea).toHaveAttribute('placeholder', '로그인하고 댓글을 남겨보세요.');
		expect(screen.getByRole('button', { name: '작성' })).toBeDisabled();
		await user.type(textarea, '댓글');
		expect(textarea).toHaveValue('');
		await user.tab();
		expect(textarea).not.toHaveFocus();
		expect(screen.getByRole('button', { name: '작성' })).not.toHaveFocus();
	});

	it('로그인하면 입력을 허용하고 작성 중 로그아웃하면 입력과 작성을 막는다', async () => {
		const user = userEvent.setup();
		const guest = { isAuthenticated: false, isInitialized: true, isOnboarding: false };
		const { rerender } = render(renderInput(guest));

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
		expect(textarea).toBeDisabled();
		expect(button).toBeDisabled();
	});
});
