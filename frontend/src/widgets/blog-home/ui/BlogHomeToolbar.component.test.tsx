import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import BlogHomeToolbar from './BlogHomeToolbar';

describe('BlogHomeToolbar', () => {
	it('카테고리 선택 상태를 로컬에서 유지한다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" />);

		await user.click(screen.getByRole('button', { name: 'IT' }));

		expect(screen.getByRole('button', { name: 'IT' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'false');
	});

	it('모바일 글 탐색을 인라인으로 펼쳐 같은 시리즈와 코로그 구조를 보여준다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" />);

		const trigger = screen.getByRole('button', { name: '글 탐색 펼치기' });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('시리즈 4 · 코로그 3')).not.toBeInTheDocument();
		expect(screen.queryByRole('navigation', { name: '시리즈와 코로그 탐색' })).not.toBeInTheDocument();

		await user.click(trigger);

		const navigation = screen.getByRole('navigation', { name: '시리즈와 코로그 탐색' });
		expect(screen.getByRole('button', { name: '글 탐색 접기' })).toHaveAttribute('aria-expanded', 'true');
		expect(within(navigation).getByRole('heading', { name: '시리즈' })).toBeInTheDocument();
		expect(within(navigation).getByRole('heading', { name: '코로그' })).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('인라인 탐색에서 코로그 disclosure를 조작해도 상위 탐색을 유지한다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" />);

		await user.click(screen.getByRole('button', { name: '글 탐색 펼치기' }));
		const navigation = screen.getByRole('navigation', { name: '시리즈와 코로그 탐색' });
		await user.click(within(navigation).getByRole('button', { name: 'Rilog 챕터 펼치기' }));

		expect(screen.getByRole('button', { name: '글 탐색 접기' })).toHaveAttribute('aria-expanded', 'true');
		expect(within(navigation).getByRole('group', { name: 'Rilog 챕터' })).toBeInTheDocument();
	});

	it('코로그에서는 챕터 수를 요약하고 챕터 탐색을 펼친다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="COLOG" />);

		const trigger = screen.getByRole('button', { name: '글 탐색 펼치기' });
		await user.click(trigger);

		expect(screen.getByRole('navigation', { name: '챕터 탐색' })).toBeInTheDocument();
	});
});
