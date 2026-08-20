import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { renderWithQuery as render } from '@/test/render-with-query';

import SignUpPage from './page';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: vi.fn(), replace: vi.fn() }),
}));

describe('SignUpPage', () => {
	it('프로필 설정 페이지 제목을 안내한다', () => {
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: false, isInitialized: true }}>
				<SignUpPage />
			</AUTH_CONTEXT.Provider>,
		);

		expect(screen.getByRole('heading', { name: '프로필 설정' })).toBeInTheDocument();
	});
});
