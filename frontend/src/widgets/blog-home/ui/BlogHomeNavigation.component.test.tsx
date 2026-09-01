import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import BlogHomeNavigation from './BlogHomeNavigation';

describe('BlogHomeNavigation', () => {
	it('RILOG은 시리즈와 코로그 구조를 정적으로 보여주고 모든 챕터는 접혀 있다', () => {
		render(<BlogHomeNavigation blogType="RILOG" />);

		const navigation = screen.getByRole('navigation', { name: '시리즈와 코로그 탐색' });

		expect(within(navigation).getByText('전체보기')).toHaveAttribute('aria-current', 'page');
		expect(within(navigation).getByRole('heading', { name: '시리즈' })).toBeInTheDocument();
		expect(within(navigation).getByRole('heading', { name: '코로그' })).toBeInTheDocument();
		expect(within(navigation).getByText('우테코에서 살아남기')).toBeInTheDocument();
		expect(within(navigation).getByText('우아한형제들')).toBeInTheDocument();
		expect(within(navigation).queryByRole('group', { name: '우아한형제들 챕터' })).not.toBeInTheDocument();
		expect(within(navigation).queryByRole('button', { name: /글 \d+개/u })).not.toBeInTheDocument();
	});

	it('코로그 화살표는 챕터를 펼치고 다시 접는다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeNavigation blogType="RILOG" />);

		const toggle = screen.getByRole('button', { name: 'Rilog 챕터 펼치기' });
		await user.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('group', { name: 'Rilog 챕터' })).toBeInTheDocument();
		expect(screen.getByText('Frontend')).toBeInTheDocument();

		await user.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByRole('group', { name: 'Rilog 챕터' })).not.toBeInTheDocument();
	});

	it('COLOG은 챕터 목록만 정적으로 보여준다', () => {
		render(<BlogHomeNavigation blogType="COLOG" />);

		const navigation = screen.getByRole('navigation', { name: '챕터 탐색' });

		expect(within(navigation).getByText('전체보기')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('heading', { name: '챕터' })).toBeInTheDocument();
		expect(screen.getByText('FE')).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: '시리즈' })).not.toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: '코로그' })).not.toBeInTheDocument();
	});
});
