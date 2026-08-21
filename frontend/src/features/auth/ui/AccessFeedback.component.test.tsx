import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery as render } from '@/test/render-with-query';

import AccessFeedback from './AccessFeedback';

const { replaceMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

describe('AccessFeedback', () => {
	beforeEach(() => {
		replaceMock.mockReset();
	});

	it.each([
		{
			reason: 'auth-required' as const,
			title: '로그인이 필요한 페이지입니다.',
			description: '홈으로 이동합니다. 로그인 후 이용해 주세요.',
		},
		{
			reason: 'forbidden' as const,
			title: '접근 권한이 없는 페이지입니다.',
			description: '페이지를 이용할 권한이 있는지 확인해 주세요.',
		},
		{
			reason: 'sign-up-unavailable' as const,
			title: '회원가입을 진행할 수 없습니다.',
			description: '회원가입은 처음 로그인한 사용자만 진행할 수 있습니다.',
		},
	])('$reason 안내를 확인하면 지정한 경로로 교체한다', async ({ description, reason, title }) => {
		const user = userEvent.setup();
		render(<AccessFeedback isOpen reason={reason} redirectPath="/@rilog" />);

		const dialog = screen.getByRole('alertdialog', { name: title });
		expect(dialog).toHaveAccessibleDescription(description);

		await user.click(screen.getByRole('button', { name: '확인' }));

		expect(replaceMock).toHaveBeenCalledWith('/@rilog', { scroll: false });
	});

	it('피드백 대상이 아니면 모달을 표시하지 않는다', () => {
		render(<AccessFeedback isOpen={false} reason="auth-required" redirectPath="/feeds" />);

		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
	});
});
