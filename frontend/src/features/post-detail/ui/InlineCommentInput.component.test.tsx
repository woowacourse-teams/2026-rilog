import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import type { AuthContextValue } from '@/features/auth/model/auth-context';

import InlineCommentInput from './InlineCommentInput';

function ControlledInput() {
	const [value, setValue] = useState('');
	return <InlineCommentInput isOpen value={value} onChange={setValue} />;
}

const renderInput = (auth: AuthContextValue) => (
	<AUTH_CONTEXT.Provider value={auth}>
		<ControlledInput />
	</AUTH_CONTEXT.Provider>
);

describe('InlineCommentInput', () => {
	it.each([
		{ isAuthenticated: false, isInitialized: true, isOnboarding: false },
		{ isAuthenticated: false, isInitialized: false, isOnboarding: false },
		{ isAuthenticated: true, isInitialized: false, isOnboarding: false },
		{ isAuthenticated: false, isInitialized: true, isOnboarding: true },
	])('회원 인증이 완료되지 않으면 댓글 입력을 렌더링하지 않는다: %j', (auth) => {
		render(renderInput(auth));
		expect(screen.queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '작성' })).not.toBeInTheDocument();
	});

	it('로그인하면 입력을 허용하고 작성 중 로그아웃하면 입력과 작성을 막는다', async () => {
		const user = userEvent.setup();
		const guest = { isAuthenticated: false, isInitialized: true, isOnboarding: false };
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
});
