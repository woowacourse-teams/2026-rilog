import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/render-with-query';

import CologNavigation from './CologNavigation';

vi.mock('@/shared/api/users/queries/my-cologs-preview/use-query', () => ({
	useMyCologsPreviewQuery: vi.fn(() => ({
		data: [
			{ id: 1, slug: 'test-colog', name: '테스트 코로그', logoUrl: null },
			{ id: 2, slug: 'another-colog', name: '다른 코로그', logoUrl: null },
		],
		isPending: false,
	})),
}));

describe('CologNavigation', () => {
	it('내 팀 링크와 생성 링크를 제공한다', () => {
		renderWithQuery(<CologNavigation />);

		const navigation = screen.getByRole('navigation');
		const cologLinks = within(navigation).getAllByRole('link');

		expect(cologLinks.length).toBeGreaterThan(0);
		cologLinks.forEach((link) => {
			expect(link).toHaveAttribute('href');
			expect(link).toHaveAccessibleName();
		});
		expect(within(navigation).getByRole('link', { name: '팀 만들기' })).toHaveAttribute('href', '/co-logs/create');
	});

	it('키보드로 팀 링크와 생성 링크에 접근한다', async () => {
		const user = userEvent.setup();
		renderWithQuery(<CologNavigation />);
		const navigation = screen.getByRole('navigation');
		const cologLinks = within(navigation).getAllByRole('link');
		const createLink = within(navigation).getByRole('link', { name: '팀 만들기' });

		await user.tab();
		expect(cologLinks[0]).toHaveFocus();

		for (let index = 1; index < cologLinks.length - 1; index += 1) {
			await user.tab();
		}
		await user.tab();
		expect(createLink).toHaveFocus();
	});
});
