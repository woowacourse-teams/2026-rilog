import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery as render } from '@/test/render-with-query';

import AuthRequiredFeedback from './AuthRequiredFeedback';

const { replaceMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

describe('AuthRequiredFeedback', () => {
	beforeEach(() => {
		replaceMock.mockReset();
	});

	it('인증 필요 안내를 확인하면 query가 없는 피드 경로로 교체한다', async () => {
		const user = userEvent.setup();
		render(<AuthRequiredFeedback isOpen />);

		const dialog = screen.getByRole('alertdialog', { name: '로그인이 필요한 페이지입니다.' });
		expect(dialog).toHaveAccessibleDescription('로그인 후 다시 이용해 주세요.');

		await user.click(screen.getByRole('button', { name: '확인' }));

		expect(replaceMock).toHaveBeenCalledWith('/feeds', { scroll: false });
	});

	it('인증 필요 안내 대상이 아니면 모달을 표시하지 않는다', () => {
		render(<AuthRequiredFeedback isOpen={false} />);

		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
	});
});
