import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';

import BlogHomeCologAside from './BlogHomeCologAside';

vi.mock('@/features/blog-home-index/hooks/use-blog-home-index');

describe('BlogHomeCologAside', () => {
	beforeEach(() => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: {
				totalCount: 3,
				chapterIndexes: [],
				cologIndexes: [
					{
						id: 7,
						slug: 'woowa-bros',
						name: '우아한형제들',
						profileImageUrl: null,
						postCount: 3,
					},
				],
			},
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});
	});

	it('API 코로그 이미지와 slug로 aside 링크를 제공하고 null 이미지는 fallback한다', () => {
		render(<BlogHomeCologAside slug="jetproc" />);

		const cologs = screen.getByRole('region', { name: 'Colog' });
		expect(within(cologs).getByRole('img', { name: '우아한형제들 로고' })).toBeInTheDocument();
		expect(within(cologs).getByRole('link', { name: '우아한형제들 Colog로 이동' })).toHaveAttribute(
			'href',
			'/@woowa-bros',
		);
	});

	it('API 코로그 배열이 비면 aside 빈 상태를 제공한다', () => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: { totalCount: 0, chapterIndexes: [], cologIndexes: [] },
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});

		render(<BlogHomeCologAside slug="jetproc" />);

		expect(screen.getByText('아직 참여한 Colog가 없습니다.')).toBeInTheDocument();
	});

	it('목록을 불러오는 동안 상태를 안내한다', () => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: undefined,
			hasError: false,
			isPending: true,
			retry: vi.fn(),
		});

		render(<BlogHomeCologAside slug="jetproc" />);

		expect(screen.getByText('Colog 목록을 불러오는 중...')).toBeInTheDocument();
	});

	it('목록 조회 오류에서 재시도 동작을 제공한다', async () => {
		const user = userEvent.setup();
		const retry = vi.fn();
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: undefined,
			hasError: true,
			isPending: false,
			retry,
		});

		render(<BlogHomeCologAside slug="jetproc" />);

		expect(screen.getByRole('alert')).toHaveTextContent('Colog 목록을 불러오지 못했어요.');
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(retry).toHaveBeenCalledOnce();
	});
});
