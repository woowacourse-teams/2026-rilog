import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SeriesAccordion from './SeriesAccordion';

describe('SeriesAccordion', () => {
	it('시리즈의 게시글 수와 게시글 링크를 렌더링한다', () => {
		render(<SeriesAccordion slug="rilog-team" postId={65} />);
		const seriesLink = screen.getByRole('link', { name: 'Next.js로 블로그 만들기' });

		expect(seriesLink).toHaveAttribute('href', '/@rilog-team?series=3');
		expect(seriesLink.parentElement).toHaveTextContent('3');
		expect(screen.getByRole('link', { name: /Server Component로 데이터 가져오기/, hidden: true })).toHaveAttribute(
			'href',
			'/@rilog-team/posts/102',
		);
	});
});
