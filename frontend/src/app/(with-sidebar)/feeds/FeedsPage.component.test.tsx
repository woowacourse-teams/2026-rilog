import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FeedsPage, { dynamic } from './page';

vi.mock('@/widgets/post-feed/PostFeed', () => ({
	default: () => (
		<section>
			<h1>Rilog</h1>
			<p>홈 피드 위젯</p>
		</section>
	),
}));

describe('FeedsPage', () => {
	it('최신 피드를 위해 동적으로 렌더링한다', () => {
		expect(dynamic).toBe('force-dynamic');
	});

	it('피드 경로에서 홈 피드 위젯을 조립한다', () => {
		render(<FeedsPage />);

		expect(screen.getByRole('heading', { name: 'Rilog' })).toBeInTheDocument();
		expect(screen.getByText('홈 피드 위젯')).toBeInTheDocument();
	});
});
