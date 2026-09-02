import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import SidebarHeader from './SidebarHeader';

describe('SidebarBrand', () => {
	it('메인으로 이동하는 브랜드 링크를 제공한다', async () => {
		const user = userEvent.setup();
		render(<SidebarHeader />);

		const brandLink = screen.getByRole('link');
		expect(brandLink).toHaveAttribute('href', '/feeds');

		const [collapsedBrand, expandedBrand] = brandLink.querySelectorAll('img');
		expect(collapsedBrand).toHaveAttribute('src', '/brand/sidebar-icon.svg');
		expect(collapsedBrand).toHaveClass('top-0', 'h-5.5', 'group-hover:opacity-0');

		expect(expandedBrand).toHaveAttribute('src', '/brand/logo.svg');
		expect(expandedBrand).toHaveClass('top-0', 'h-7', 'opacity-0', 'group-hover:opacity-100');

		await user.tab();
		expect(brandLink).toHaveFocus();
	});
});
