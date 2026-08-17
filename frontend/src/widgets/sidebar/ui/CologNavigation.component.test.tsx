import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import CologNavigation from './CologNavigation';

describe('CologNavigation', () => {
	it('내 코로그 링크와 생성 링크를 제공한다', () => {
		render(<CologNavigation />);

		const navigation = screen.getByRole('navigation');
		const cologLinks = within(navigation).getAllByRole('link');

		expect(cologLinks.length).toBeGreaterThan(0);
		cologLinks.forEach((link) => {
			expect(link).toHaveAttribute('href');
			expect(link).toHaveAccessibleName();
		});
		expect(within(navigation).getByRole('link', { name: '코로그 만들기' })).toHaveAttribute('href', '/co-logs/create');
	});

	it('키보드로 코로그 링크와 생성 링크에 접근한다', async () => {
		const user = userEvent.setup();
		render(<CologNavigation />);
		const navigation = screen.getByRole('navigation');
		const cologLinks = within(navigation).getAllByRole('link');
		const createLink = within(navigation).getByRole('link', { name: '코로그 만들기' });

		await user.tab();
		expect(cologLinks[0]).toHaveFocus();

		for (let index = 1; index < cologLinks.length - 1; index += 1) {
			await user.tab();
		}
		await user.tab();
		expect(createLink).toHaveFocus();
	});
});
