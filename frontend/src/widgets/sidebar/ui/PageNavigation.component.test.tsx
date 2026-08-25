import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithQuery as render } from '@/test/render-with-query';

import PageNavigation from './PageNavigation';

describe('PageNavigation', () => {
	it('전체 게시글 수를 포함한 피드 탐색 링크를 제공한다', () => {
		render(<PageNavigation />);

		const navigation = screen.getByRole('navigation');
		const feedLink = within(navigation).getByRole('link');

		expect(feedLink).toHaveAttribute('aria-current', 'page');
		expect(feedLink).toHaveAccessibleName();
	});

	it('키보드로 피드 탐색 링크에 접근한다', async () => {
		const user = userEvent.setup();
		render(<PageNavigation />);
		const feedLink = screen.getByRole('link');

		await user.tab();
		expect(feedLink).toHaveFocus();
	});
});
