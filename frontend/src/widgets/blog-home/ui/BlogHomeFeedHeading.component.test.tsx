import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';

import BlogHomeFeedHeading from './BlogHomeFeedHeading';

vi.mock('@/features/blog-home-index/hooks/use-blog-home-index');

const INDEX = {
	totalCount: 18,
	chapterIndexes: [
		{ id: 3, name: '회고', postCount: 12 },
		{ id: 4, name: '아주 긴 이름도 생략하지 않고 표시하는 프론트엔드 챕터', postCount: 6 },
	],
	cologIndexes: [],
};

describe('BlogHomeFeedHeading', () => {
	beforeEach(() => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: INDEX,
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});
	});

	it('전체 필터는 전체 제목을 표시하고 기존 인덱스 캐시를 구독한다', () => {
		render(
			<BlogHomeFeedHeading blogType="COLOG" slug="rilog-team" filter={{ type: 'all' }} initialIndexRequestFailed />,
		);

		expect(screen.getByRole('heading', { level: 2, name: '전체' })).toBeInTheDocument();
		expect(useBlogHomeIndex).toHaveBeenCalledWith({ slug: 'rilog-team', initialRequestFailed: true });
	});

	it('선택한 챕터 이름을 제목으로 표시하고 필터 변경을 반영한다', () => {
		const { rerender } = render(
			<BlogHomeFeedHeading blogType="COLOG" slug="rilog-team" filter={{ type: 'chapterId', chapterId: 3 }} />,
		);

		expect(screen.getByRole('heading', { level: 2, name: '회고' })).toBeInTheDocument();

		rerender(<BlogHomeFeedHeading blogType="COLOG" slug="rilog-team" filter={{ type: 'chapterId', chapterId: 4 }} />);

		expect(
			screen.getByRole('heading', { level: 2, name: '아주 긴 이름도 생략하지 않고 표시하는 프론트엔드 챕터' }),
		).toBeInTheDocument();
	});

	it('인덱스를 확인할 수 없으면 챕터를 표시하고 캐시가 복구되면 실제 이름으로 갱신한다', () => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: undefined,
			hasError: true,
			isPending: false,
			retry: vi.fn(),
		});
		const { rerender } = render(
			<BlogHomeFeedHeading
				blogType="COLOG"
				slug="rilog-team"
				filter={{ type: 'chapterId', chapterId: 3 }}
				initialIndexRequestFailed
			/>,
		);

		expect(screen.getByRole('heading', { level: 2, name: '챕터' })).toBeInTheDocument();

		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: INDEX,
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});
		rerender(
			<BlogHomeFeedHeading
				blogType="COLOG"
				slug="rilog-team"
				filter={{ type: 'chapterId', chapterId: 3 }}
				initialIndexRequestFailed
			/>,
		);

		expect(screen.getByRole('heading', { level: 2, name: '회고' })).toBeInTheDocument();
	});

	it.each([
		[{ type: 'all' } as const, '전체'],
		[{ type: 'chapterId', chapterId: 3 } as const, '회고'],
		[{ type: 'targetCologSlug', targetCologSlug: 'rilog-team' } as const, '리로그 팀'],
	])('개인 홈 필터 %o의 제목을 표시한다', (filter, expectedTitle) => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: {
				...INDEX,
				cologIndexes: [{ id: 7, slug: 'rilog-team', name: '리로그 팀', profileImageUrl: null, postCount: 3 }],
			},
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});

		render(<BlogHomeFeedHeading blogType="RILOG" slug="jetproc" filter={filter} />);

		expect(screen.getByRole('heading', { level: 2, name: expectedTitle })).toBeInTheDocument();
	});

	it.each([
		[{ type: 'chapterId', chapterId: 999 } as const, '시리즈'],
		[{ type: 'targetCologSlug', targetCologSlug: 'unknown' } as const, 'Colog'],
	])('개인 홈 인덱스에 이름이 없는 필터 %o는 fallback을 표시한다', (filter, expectedTitle) => {
		render(<BlogHomeFeedHeading blogType="RILOG" slug="jetproc" filter={filter} />);

		expect(screen.getByRole('heading', { level: 2, name: expectedTitle })).toBeInTheDocument();
	});

	it('개인 홈 Colog 제목은 인덱스가 복구되면 실제 이름으로 갱신한다', () => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: undefined,
			hasError: true,
			isPending: false,
			retry: vi.fn(),
		});
		const filter = { type: 'targetCologSlug', targetCologSlug: 'rilog-team' } as const;
		const { rerender } = render(
			<BlogHomeFeedHeading blogType="RILOG" slug="jetproc" filter={filter} initialIndexRequestFailed />,
		);

		expect(screen.getByRole('heading', { level: 2, name: 'Colog' })).toBeInTheDocument();

		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: {
				...INDEX,
				cologIndexes: [{ id: 7, slug: 'rilog-team', name: '리로그 팀', profileImageUrl: null, postCount: 3 }],
			},
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});
		rerender(<BlogHomeFeedHeading blogType="RILOG" slug="jetproc" filter={filter} initialIndexRequestFailed />);

		expect(screen.getByRole('heading', { level: 2, name: '리로그 팀' })).toBeInTheDocument();
	});
});
