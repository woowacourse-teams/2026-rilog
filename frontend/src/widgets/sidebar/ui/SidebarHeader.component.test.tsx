import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SITE_NAME } from '@/shared/seo/create-social-metadata';

import SidebarHeader from './SidebarHeader';

describe('SidebarBrand', () => {
	it('메인으로 이동하는 브랜드 링크를 제공한다', async () => {
		const user = userEvent.setup();
		render(<SidebarHeader />);

		const brandLink = screen.getByRole('link', { name: `${SITE_NAME} 메인으로 이동` });
		expect(brandLink).toHaveAttribute('href', '/feeds');

		await user.tab();
		expect(brandLink).toHaveFocus();
	});
});
