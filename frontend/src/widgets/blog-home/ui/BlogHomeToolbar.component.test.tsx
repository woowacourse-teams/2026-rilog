import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';

import BlogHomeToolbar from './BlogHomeToolbar';

vi.mock('next/navigation', () => ({
	usePathname: () => '/@jetproc',
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/blog-home-index/hooks/use-blog-home-index');

vi.mock('@/shared/ui/link/CustomLink', () => ({
	default: function MockCustomLink({
		href,
		scroll: _scroll,
		onClick,
		...props
	}: ComponentProps<'a'> & { href: string; scroll?: boolean }) {
		void _scroll;

		return (
			<a
				{...props}
				href={href}
				onClick={(event) => {
					event.preventDefault();
					onClick?.(event);
				}}
			/>
		);
	},
}));

const INDEX = {
	totalCount: 18,
	chapterIndexes: [{ id: 3, name: '회고', postCount: 12 }],
	cologIndexes: [{ id: 7, slug: 'rilog-team', name: 'Rilog', profileImageUrl: null, postCount: 6 }],
};

describe('BlogHomeToolbar', () => {
	beforeEach(() => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: INDEX,
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});
	});

	it.each(['RILOG', 'COLOG'] as const)('%s 프로필에 카테고리 필터를 렌더링하지 않는다', (blogType) => {
		render(<BlogHomeToolbar blogType={blogType} slug="jetproc" filter={{ type: 'all' }} />);

		expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'IT' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '일상' })).not.toBeInTheDocument();
		expect(screen.queryByLabelText('글 카테고리')).not.toBeInTheDocument();
	});

	it('인덱스 바텀시트에 같은 API 시리즈와 코로그 구조를 보여준다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" slug="jetproc" filter={{ type: 'all' }} />);

		const trigger = screen.getByRole('button', { name: '인덱스 보기' });
		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
		expect(screen.queryByRole('navigation', { name: '시리즈와 Colog 탐색' })).not.toBeInTheDocument();

		await user.click(trigger);

		const dialog = screen.getByRole('dialog', { name: '인덱스' });
		const navigation = within(dialog).getByRole('navigation', { name: '시리즈와 Colog 탐색' });
		expect(within(navigation).getByRole('heading', { name: '시리즈' })).toBeInTheDocument();
		expect(within(navigation).getByRole('heading', { name: 'Colog' })).toBeInTheDocument();
		expect(within(navigation).getByRole('link', { name: 'Rilog, 글 6개' })).toBeInTheDocument();
	});

	it('바텀시트를 닫으면 인덱스 trigger로 focus를 복원한다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" slug="jetproc" filter={{ type: 'all' }} />);

		const trigger = screen.getByRole('button', { name: '인덱스 보기' });
		await user.click(trigger);
		await user.click(screen.getByRole('button', { name: '인덱스 닫기' }));

		await waitFor(() => expect(trigger).toHaveFocus());
	});

	it('바텀시트 인덱스 링크를 선택하면 sheet를 닫는다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="RILOG" slug="jetproc" filter={{ type: 'all' }} />);

		await user.click(screen.getByRole('button', { name: '인덱스 보기' }));
		await user.click(screen.getByRole('link', { name: 'Rilog, 글 6개' }));

		await waitFor(() => expect(screen.queryByRole('dialog', { name: '인덱스' })).not.toBeInTheDocument());
	});

	it('코로그에서는 챕터 탐색을 보여준다', async () => {
		const user = userEvent.setup();
		render(<BlogHomeToolbar blogType="COLOG" slug="rilog-team" filter={{ type: 'all' }} />);

		await user.click(screen.getByRole('button', { name: '인덱스 보기' }));

		const dialog = screen.getByRole('dialog', { name: '인덱스' });
		expect(within(dialog).getByRole('navigation', { name: '챕터 탐색' })).toBeInTheDocument();
	});
});
