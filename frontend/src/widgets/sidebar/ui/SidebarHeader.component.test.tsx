import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import SidebarHeader from './SidebarHeader';

describe('SidebarBrand', () => {
	it('메인으로 이동하는 브랜드 링크를 제공한다', async () => {
		const user = userEvent.setup();
		render(<SidebarHeader />);

		const brandLink = screen.getByRole('link', { name: 'Rilog 메인으로 이동' });
		expect(brandLink).toHaveAttribute('href', '/feeds');

		const [collapsedBrand, expandedBrand] = brandLink.querySelectorAll('img');
		expect(collapsedBrand).toHaveAttribute('src', '/brand/sidebar-icon.svg');
		expect(collapsedBrand).toHaveClass('top-0', 'h-5.5');
		expect(collapsedBrand).not.toHaveClass('group-hover:opacity-0');

		expect(expandedBrand).toHaveAttribute('src', '/brand/logo.svg');
		expect(expandedBrand).toHaveClass('top-0', 'h-7', 'opacity-0', 'group-hover:opacity-100');

		await user.tab();
		expect(brandLink).toHaveFocus();
	});

	it('리로그 이야기 링크는 사이드바가 펼쳐질 때만 보이도록 제공한다', () => {
		render(<SidebarHeader />);

		const aboutLink = screen.getByRole('link', { name: 'Rilog. 이야기 ↗', hidden: true });

		expect(aboutLink).toHaveClass('invisible', 'opacity-0', 'group-hover:visible', 'group-hover:opacity-100');
	});
});
