import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSeriesPosts } from '@/features/post-detail/lib/get-series-posts';

import SeriesAccordionSection from './SeriesAccordionSection';

vi.mock('@/features/post-detail/lib/get-series-posts');

const CHAPTER = { id: 3, name: 'Next.js로 블로그 만들기', order: 1 };

describe('SeriesAccordionSection', () => {
	beforeEach(() => {
		vi.mocked(getSeriesPosts).mockReset();
	});

	it('서버에서 조회한 시리즈를 아코디언에 전달한다', async () => {
		vi.mocked(getSeriesPosts).mockResolvedValue({
			id: 3,
			name: 'Next.js로 블로그 만들기',
			postCount: 1,
			posts: [{ id: 65, title: 'App Router 설계' }],
		});

		render(await SeriesAccordionSection({ slug: 'rilog-team', postId: 65, chapter: CHAPTER }));

		expect(getSeriesPosts).toHaveBeenCalledWith({ slug: 'rilog-team', chapter: CHAPTER });
		expect(screen.getByRole('link', { name: /App Router 설계/, hidden: true })).toHaveAttribute(
			'href',
			'/@rilog-team/posts/65',
		);
	});

	it('조회 결과가 없으면 아코디언을 렌더링하지 않는다', async () => {
		vi.mocked(getSeriesPosts).mockResolvedValue(null);

		const { container } = render(await SeriesAccordionSection({ slug: 'rilog-team', postId: 65, chapter: CHAPTER }));

		expect(container).toBeEmptyDOMElement();
	});
});
