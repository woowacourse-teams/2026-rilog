import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import BlogHomeToolbar from './BlogHomeToolbar';

describe('BlogHomeToolbar', () => {
	it.each(['RILOG', 'COLOG'] as const)('%s 프로필에 카테고리 필터를 렌더링하지 않는다', (blogType) => {
		render(<BlogHomeToolbar blogType={blogType} />);

		expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'IT' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '일상' })).not.toBeInTheDocument();
		expect(screen.queryByLabelText('글 카테고리')).not.toBeInTheDocument();
	});

	it('인덱스 바텀시트에 같은 시리즈와 코로그 구조를 보여준다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" />);

		const trigger = screen.getByRole('button', { name: '인덱스 보기' });
		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
		expect(screen.queryByRole('navigation', { name: '시리즈와 코로그 탐색' })).not.toBeInTheDocument();

		await user.click(trigger);

		const dialog = screen.getByRole('dialog', { name: '인덱스' });
		const navigation = within(dialog).getByRole('navigation', { name: '시리즈와 코로그 탐색' });
		expect(within(navigation).getByRole('heading', { name: '시리즈' })).toBeInTheDocument();
		expect(within(navigation).getByRole('heading', { name: '코로그' })).toBeInTheDocument();
	});

	it('바텀시트를 닫으면 인덱스 trigger로 focus를 복원한다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" />);

		const trigger = screen.getByRole('button', { name: '인덱스 보기' });
		await user.click(trigger);
		await user.click(screen.getByRole('button', { name: '인덱스 닫기' }));

		await waitFor(() => expect(trigger).toHaveFocus());
	});

	it('바텀시트에서 인덱스 항목을 클릭해도 현재 탐색을 유지한다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" />);

		await user.click(screen.getByRole('button', { name: '인덱스 보기' }));
		const navigation = screen.getByRole('navigation', { name: '시리즈와 코로그 탐색' });
		await user.click(within(navigation).getByRole('button', { name: 'Rilog, 글 6개' }));

		expect(screen.getByRole('dialog', { name: '인덱스' })).toBeInTheDocument();
		expect(within(navigation).getByRole('button', { name: '전체보기' })).toHaveAttribute('aria-current', 'page');
	});

	it('코로그에서는 챕터 수를 요약하고 챕터 탐색을 펼친다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="COLOG" />);

		const trigger = screen.getByRole('button', { name: '인덱스 보기' });
		await user.click(trigger);

		const dialog = screen.getByRole('dialog', { name: '인덱스' });
		expect(within(dialog).getByRole('navigation', { name: '챕터 탐색' })).toBeInTheDocument();
	});
});
