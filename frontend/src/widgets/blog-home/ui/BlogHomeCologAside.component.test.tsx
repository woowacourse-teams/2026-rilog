import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BlogHomeCologAside from './BlogHomeCologAside';

describe('BlogHomeCologAside', () => {
	it('Cologs 제목 아래 참여 코로그 로고를 둥근 정사각형 링크로 제공한다', () => {
		render(<BlogHomeCologAside />);

		const cologs = screen.getByRole('region', { name: 'Cologs' });

		expect(within(cologs).getAllByRole('img')).toHaveLength(3);
		expect(within(cologs).getByRole('img', { name: '우아한형제들 로고' })).toBeInTheDocument();
		expect(within(cologs).getByRole('img', { name: 'Rilog 로고' })).toBeInTheDocument();
		expect(within(cologs).getByRole('link', { name: '우아한형제들 코로그로 이동' })).toHaveAttribute(
			'href',
			'/@woowa-bros',
		);
	});
});
