import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import SidebarNavigationLink from './SidebarNavigationLink';

describe('SidebarNavigationLink', () => {
	it('아이콘, label과 badge를 하나의 탐색 링크로 제공한다', () => {
		render(
			<SidebarNavigationLink
				href="/feeds"
				accessibilityLabel="피드 132"
				icon={<span aria-hidden="true">F</span>}
				label="Feed"
				badge={132}
				isCurrent
			/>,
		);

		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', '/feeds');
		expect(link).toHaveAttribute('aria-current', 'page');
		expect(link).toHaveTextContent('Feed');
		expect(link).toHaveTextContent('132');
	});

	it('키보드로 접근할 수 있다', async () => {
		const user = userEvent.setup();
		render(<SidebarNavigationLink href="/teams/rilog" icon={<span aria-hidden="true">R</span>} label="Rilog" />);

		await user.tab();
		expect(screen.getByRole('link')).toHaveFocus();
	});
});
