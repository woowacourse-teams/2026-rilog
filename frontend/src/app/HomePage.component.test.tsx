import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('HomePage', () => {
	it('서비스 이름과 설명을 안내한다', () => {
		render(<HomePage />);

		expect(screen.getByRole('heading', { name: 'Rilog' })).toBeInTheDocument();
		expect(screen.getByText('기록을 작성하고 함께 나누는 공간')).toBeInTheDocument();
	});
});
