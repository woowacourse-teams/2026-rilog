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

		expect(expandedBrand).toHaveAttribute('src', '/brand/logo.svg');

		await user.tab();
		expect(brandLink).toHaveFocus();
	});

	it('브랜드 헤더에는 메인 이동 링크만 제공한다', () => {
		render(<SidebarHeader />);

		expect(screen.queryByRole('link', { name: 'Rilog. 이야기 ↗' })).not.toBeInTheDocument();
	});
});
