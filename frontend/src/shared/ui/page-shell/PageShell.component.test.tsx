import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PageShell from './PageShell';

describe('PageShell', () => {
	it('aside가 없으면 complementary landmark를 렌더링하지 않는다', () => {
		render(
			<PageShell>
				<h2>메인 콘텐츠</h2>
			</PageShell>,
		);

		expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
		expect(screen.getByRole('main')).toHaveTextContent('메인 콘텐츠');
	});

	it('제공된 aside만 렌더링한다', () => {
		const { rerender } = render(
			<PageShell leftAside={<h2>왼쪽 보조 콘텐츠</h2>}>
				<h2>메인 콘텐츠</h2>
			</PageShell>,
		);

		expect(screen.getByRole('complementary')).toHaveTextContent('왼쪽 보조 콘텐츠');

		rerender(
			<PageShell rightAside={<h2>오른쪽 보조 콘텐츠</h2>}>
				<h2>메인 콘텐츠</h2>
			</PageShell>,
		);

		expect(screen.getByRole('complementary')).toHaveTextContent('오른쪽 보조 콘텐츠');
	});

	it('각 콘텐츠를 정해진 영역에 배치한다', () => {
		render(
			<PageShell
				header={<h2>헤더 콘텐츠</h2>}
				leftAside={<h2>왼쪽 보조 콘텐츠</h2>}
				rightAside={<h2>오른쪽 보조 콘텐츠</h2>}
			>
				<h2>메인 콘텐츠</h2>
			</PageShell>,
		);

		const header = screen.getByRole('banner');
		const [leftAside, rightAside] = screen.getAllByRole('complementary');
		const main = screen.getByRole('main');

		expect(within(header).getByRole('heading', { name: '헤더 콘텐츠' })).toBeInTheDocument();
		expect(within(leftAside).getByRole('heading', { name: '왼쪽 보조 콘텐츠' })).toBeInTheDocument();
		expect(within(main).getByRole('heading', { name: '메인 콘텐츠' })).toBeInTheDocument();
		expect(within(rightAside).getByRole('heading', { name: '오른쪽 보조 콘텐츠' })).toBeInTheDocument();
	});
});
