import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import PageNavigation from './PageNavigation';

describe('PageNavigation', () => {
	it('피드와 코로그 탐색 링크를 변경된 접근 가능한 이름으로 제공한다', () => {
		render(<PageNavigation />);

		const navigation = screen.getByRole('navigation');
		const [feedLink, cologLink] = within(navigation).getAllByRole('link');

		expect(feedLink).toHaveAttribute('aria-current', 'page');
		expect(cologLink).toHaveAttribute('href', '/cologs');
		expect(feedLink).toHaveAccessibleName();
		expect(cologLink).toHaveAccessibleName();
	});

	it('키보드로 탐색 링크를 순차적으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<PageNavigation />);
		const [feedLink, cologLink] = screen.getAllByRole('link');

		await user.tab();
		expect(feedLink).toHaveFocus();

		await user.tab();
		expect(cologLink).toHaveFocus();
	});
});
