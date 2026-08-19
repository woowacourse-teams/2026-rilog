import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithQuery as render } from '@/test/render-with-query';

import SignUpPage from './page';

describe('SignUpPage', () => {
	it('프로필 설정 페이지 제목을 안내한다', () => {
		render(<SignUpPage />);

		expect(screen.getByRole('heading', { name: '프로필 설정' })).toBeInTheDocument();
	});
});
