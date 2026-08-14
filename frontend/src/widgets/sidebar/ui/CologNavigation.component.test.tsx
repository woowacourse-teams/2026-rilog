import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import CologNavigation from './CologNavigation';

describe('CologNavigation', () => {
	it('내 코로그 링크와 생성 버튼을 제공한다', () => {
		render(<CologNavigation />);

		const navigation = screen.getByRole('navigation', { name: '내 코로그' });
		expect(within(navigation).getAllByRole('link')).toHaveLength(4);
		expect(within(navigation).getByRole('link', { name: '토스 테크' })).toHaveAttribute('href', '/teams/toss-tech');
		expect(within(navigation).getByRole('link', { name: '우아한테크코스' })).toHaveAttribute(
			'href',
			'/teams/woowacourse',
		);
		expect(within(navigation).getByRole('link', { name: '배달의 민족' })).toHaveAttribute('href', '/teams/baemin');
		expect(within(navigation).getByRole('link', { name: '안드로메다' })).toHaveAttribute('href', '/teams/andromeda');
		expect(within(navigation).getByRole('button', { name: '코로그 만들기' })).toBeEnabled();
	});

	it('키보드로 코로그 링크와 생성 버튼에 접근한다', async () => {
		const user = userEvent.setup();
		render(<CologNavigation />);

		await user.tab();
		expect(screen.getByRole('link', { name: '토스 테크' })).toHaveFocus();

		await user.tab();
		await user.tab();
		await user.tab();
		await user.tab();
		expect(screen.getByRole('button', { name: '코로그 만들기' })).toHaveFocus();
	});
});
