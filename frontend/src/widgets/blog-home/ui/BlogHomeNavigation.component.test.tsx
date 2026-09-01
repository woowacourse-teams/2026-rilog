import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import BlogHomeNavigation from './BlogHomeNavigation';

describe('BlogHomeNavigation', () => {
	it('RILOG은 클릭 가능한 시리즈와 코로그를 동일한 단일 계층으로 보여준다', () => {
		render(<BlogHomeNavigation blogType="RILOG" />);

		const navigation = screen.getByRole('navigation', { name: '시리즈와 코로그 탐색' });

		expect(within(navigation).getByRole('button', { name: '전체보기' })).toHaveAttribute('aria-current', 'page');
		expect(within(navigation).getByRole('heading', { name: '시리즈' })).toBeInTheDocument();
		expect(within(navigation).getByRole('heading', { name: '코로그' })).toBeInTheDocument();
		expect(within(navigation).getByRole('button', { name: '우테코에서 살아남기, 글 12개' })).toBeInTheDocument();
		expect(within(navigation).getByRole('button', { name: '우아한형제들, 글 12개' })).toBeInTheDocument();
		expect(within(navigation).queryByRole('button', { name: /챕터 펼치기/ })).not.toBeInTheDocument();
		expect(within(navigation).queryByRole('group', { name: /챕터/ })).not.toBeInTheDocument();
	});

	it('인덱스 항목을 클릭해도 현재 항목을 변경하지 않는다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeNavigation blogType="RILOG" />);

		await user.click(screen.getByRole('button', { name: '우테코에서 살아남기, 글 12개' }));
		await user.click(screen.getByRole('button', { name: '우아한형제들, 글 12개' }));

		expect(screen.getByRole('button', { name: '전체보기' })).toHaveAttribute('aria-current', 'page');
	});

	it('COLOG은 클릭 가능한 챕터 목록만 보여준다', () => {
		render(<BlogHomeNavigation blogType="COLOG" />);

		const navigation = screen.getByRole('navigation', { name: '챕터 탐색' });
		const chapterSection = within(navigation).getByRole('region', { name: '챕터' });
		const chapterButtons = within(chapterSection).getAllByRole('button');

		expect(chapterButtons[0]).toHaveAccessibleName('전체보기');
		expect(chapterButtons[0]).toHaveAttribute('aria-current', 'page');
		expect(within(chapterSection).getByRole('button', { name: 'FE, 글 16개' })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: '시리즈' })).not.toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: '코로그' })).not.toBeInTheDocument();
	});
});
