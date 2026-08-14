import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import SidebarHeader from './SidebarHeader';

describe('SidebarBrand', () => {
	it('메인으로 이동하는 브랜드 링크를 제공한다', async () => {
		const user = userEvent.setup();
		render(<SidebarHeader />);

		const brandLink = screen.getByRole('link');
		expect(brandLink).toHaveAttribute('href', '/');
		expect(brandLink).toHaveTextContent('Rilog.');

		await user.tab();
		expect(brandLink).toHaveFocus();
	});
});
