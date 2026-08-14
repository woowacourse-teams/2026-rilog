import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import LoginModal from './LoginModal';

describe('LoginModal', () => {
	it('GitHub 로그인 안내와 action을 제공한다', async () => {
		const user = userEvent.setup();
		const onGitHubLogin = vi.fn();

		render(<LoginModal open onClose={vi.fn()} onGitHubLogin={onGitHubLogin} />);

		const dialog = screen.getByRole('dialog', { name: '로그인' });
		const githubLoginButton = screen.getByRole('button', { name: 'GitHub로 계속하기' });

		expect(dialog).toHaveAccessibleDescription(
			`GitHub 계정으로 간편하게 시작하세요.
팀의 글을 읽고 함께 기록할 수 있습니다.`,
		);
		expect(githubLoginButton).toHaveFocus();

		await user.click(githubLoginButton);
		expect(onGitHubLogin).toHaveBeenCalledOnce();
	});

	it('로그인 처리 중에는 GitHub 로그인과 모달 닫기를 막는다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onGitHubLogin = vi.fn();

		render(<LoginModal open onClose={onClose} onGitHubLogin={onGitHubLogin} isPending />);

		const githubLoginButton = screen.getByRole('button', { name: 'GitHub로 계속하기' });
		const closeButton = screen.getByRole('button', { name: '모달 닫기' });

		expect(githubLoginButton).toBeDisabled();
		expect(githubLoginButton).toHaveAttribute('aria-busy', 'true');
		expect(closeButton).toBeDisabled();

		await user.click(githubLoginButton);
		await user.click(closeButton);
		expect(onGitHubLogin).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});
});
