import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import CologNavigation from './CologNavigation';

describe('CologNavigation', () => {
	it('내 코로그 링크와 생성 버튼을 제공한다', () => {
		render(<CologNavigation />);

		const navigation = screen.getByRole('navigation');
		const cologLinks = within(navigation).getAllByRole('link');

		expect(cologLinks.length).toBeGreaterThan(0);
		cologLinks.forEach((link) => {
			expect(link).toHaveAttribute('href');
			expect(link).toHaveAccessibleName();
		});
		expect(within(navigation).getByRole('button')).toBeEnabled();
	});

	it('키보드로 코로그 링크와 생성 버튼에 접근한다', async () => {
		const user = userEvent.setup();
		render(<CologNavigation />);
		const navigation = screen.getByRole('navigation');
		const cologLinks = within(navigation).getAllByRole('link');
		const createButton = within(navigation).getByRole('button');

		await user.tab();
		expect(cologLinks[0]).toHaveFocus();

		for (let index = 1; index < cologLinks.length; index += 1) {
			await user.tab();
		}
		await user.tab();
		expect(createButton).toHaveFocus();
	});
});
