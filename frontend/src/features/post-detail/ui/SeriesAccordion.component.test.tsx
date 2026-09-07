import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SeriesAccordion from './SeriesAccordion';

describe('SeriesAccordion', () => {
	it('시리즈 정보와 게시글 목록을 렌더링한다', () => {
		render(<SeriesAccordion slug="rilog-team" postId={65} />);
		const seriesLink = screen.getByRole('link', { name: 'Next.js로 블로그 만들기' });

		expect(seriesLink).toHaveAttribute('href', '/@rilog-team');
		expect(seriesLink.parentElement).toHaveTextContent('3');
		expect(screen.getByText('Server Component로 데이터 가져오기')).toBeInTheDocument();
	});
});
