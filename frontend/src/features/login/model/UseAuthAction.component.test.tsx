import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';

import { savePendingAuthAction, takePendingAuthAction } from '../lib/pending-auth-action';

import LoginModalProvider from './LoginModalProvider';
import { useAuthAction } from './use-auth-action';

function CommentButton() {
	const createComment = useAuthAction({ beforeAuth: () => savePendingAuthAction({ target: 'comment' }) });
	return <button onClick={createComment}>댓글 작성</button>;
}

describe('useAuthAction', () => {
	beforeEach(() => sessionStorage.clear());

	it('로그인 모달을 취소하면 재개할 작업을 지운다', async () => {
		const user = userEvent.setup();
		render(
			<AUTH_CONTEXT.Provider value={{ isOnboarding: false, isAuthenticated: false, isInitialized: true }}>
				<LoginModalProvider>
					<CommentButton />
				</LoginModalProvider>
			</AUTH_CONTEXT.Provider>,
		);

		await user.click(screen.getByRole('button', { name: '댓글 작성' }));
		expect(sessionStorage.getItem('pendingAuthAction')).toContain('comment');
		await user.click(screen.getByRole('button', { name: '모달 닫기' }));
		expect(takePendingAuthAction()).toBeNull();
	});
});
