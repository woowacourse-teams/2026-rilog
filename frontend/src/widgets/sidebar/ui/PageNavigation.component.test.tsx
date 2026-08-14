import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import PageNavigation from './PageNavigation';

describe('PageNavigation', () => {
	it('피드와 코로그 탐색 링크를 변경된 접근 가능한 이름으로 제공한다', () => {
		render(<PageNavigation />);

		const navigation = screen.getByRole('navigation', { name: '주요 메뉴' });
		expect(within(navigation).getByRole('link', { name: '피드 글 132개' })).toHaveAttribute('aria-current', 'page');
		expect(within(navigation).getByRole('link', { name: '코로그 132개' })).toHaveAttribute('href', '/cologs');
	});

	it('키보드로 탐색 링크를 순차적으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<PageNavigation />);

		await user.tab();
		expect(screen.getByRole('link', { name: '피드 글 132개' })).toHaveFocus();

		await user.tab();
		expect(screen.getByRole('link', { name: '코로그 132개' })).toHaveFocus();
	});
});
