import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';

import BlogHomeNavigation from './BlogHomeNavigation';

vi.mock('next/navigation', () => ({
	usePathname: () => '/@jetproc',
	useSearchParams: () => new URLSearchParams('notice=keep'),
}));

vi.mock('@/features/blog-home-index/hooks/use-blog-home-index');

const INDEX = {
	totalCount: 23,
	chapterIndexes: [
		{ id: 3, name: '우테코에서 살아남기', postCount: 12 },
		{ id: 4, name: '회고', postCount: 7 },
	],
	cologIndexes: [
		{ id: 7, slug: 'woowa-bros', name: '우아한형제들', profileImageUrl: null, postCount: 12 },
		{ id: 8, slug: 'rilog-team', name: 'Rilog', profileImageUrl: null, postCount: 6 },
	],
};

describe('BlogHomeNavigation', () => {
	beforeEach(() => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: INDEX,
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});
	});

	it('RILOG은 API 시리즈와 코로그를 필터 링크로 보여주고 다른 query를 보존한다', () => {
		render(<BlogHomeNavigation blogType="RILOG" slug="jetproc" filter={{ type: 'all' }} />);

		const navigation = screen.getByRole('navigation', { name: '시리즈와 Colog 탐색' });
		expect(within(navigation).getByRole('link', { name: '전체보기, 글 23개' })).toHaveAttribute('aria-current', 'page');
		expect(within(navigation).getByRole('heading', { name: '시리즈' })).toBeInTheDocument();
		expect(within(navigation).getByRole('heading', { name: 'Colog' })).toBeInTheDocument();
		expect(within(navigation).getByRole('link', { name: '우테코에서 살아남기, 글 12개' })).toHaveAttribute(
			'href',
			'/@jetproc?notice=keep&series=3',
		);
		expect(within(navigation).getByRole('link', { name: '우아한형제들, 글 12개' })).toHaveAttribute(
			'href',
			'/@jetproc?notice=keep&colog=woowa-bros',
		);
	});

	it('선택한 API 인덱스 항목에만 aria-current를 제공한다', () => {
		render(<BlogHomeNavigation blogType="RILOG" slug="jetproc" filter={{ type: 'chapterId', chapterId: 3 }} />);

		expect(screen.getByRole('link', { name: '우테코에서 살아남기, 글 12개' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '전체보기, 글 23개' })).not.toHaveAttribute('aria-current');
	});

	it('COLOG은 profile type을 기준으로 챕터만 보여준다', () => {
		render(<BlogHomeNavigation blogType="COLOG" slug="rilog-team" filter={{ type: 'all' }} />);

		const navigation = screen.getByRole('navigation', { name: '챕터 탐색' });
		expect(within(navigation).getByRole('link', { name: '우테코에서 살아남기, 글 12개' })).toHaveAttribute(
			'href',
			'/@jetproc?notice=keep&chapter=3',
		);
		expect(screen.queryByRole('heading', { name: '시리즈' })).not.toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Colog' })).not.toBeInTheDocument();
	});

	it('인덱스 실패에는 retry를, 빈 배열에는 빈 상태를 제공한다', () => {
		const retry = vi.fn();
		vi.mocked(useBlogHomeIndex).mockReturnValueOnce({
			index: undefined,
			hasError: true,
			isPending: false,
			retry,
		});
		const { rerender } = render(<BlogHomeNavigation blogType="COLOG" slug="rilog-team" filter={{ type: 'all' }} />);

		screen.getByRole('button', { name: '다시 시도' }).click();
		expect(retry).toHaveBeenCalledOnce();

		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: { totalCount: 0, chapterIndexes: [], cologIndexes: [] },
			hasError: false,
			isPending: false,
			retry,
		});
		rerender(<BlogHomeNavigation blogType="COLOG" slug="rilog-team" filter={{ type: 'all' }} />);

		expect(screen.queryByText('아직 등록된 챕터가 없습니다.')).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: '전체보기, 글 0개' })).toBeInTheDocument();

		rerender(<BlogHomeNavigation blogType="RILOG" slug="rilog-team" filter={{ type: 'all' }} />);

		expect(screen.getByText('없음')).toBeInTheDocument();
	});

	it('인덱스 재조회 중에는 loading 상태를 알린다', () => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: undefined,
			hasError: false,
			isPending: true,
			retry: vi.fn(),
		});

		render(<BlogHomeNavigation blogType="RILOG" slug="jetproc" filter={{ type: 'all' }} />);

		expect(screen.getByText('인덱스를 불러오는 중...')).toHaveAttribute('aria-live', 'polite');
	});
});
