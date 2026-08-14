import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SidebarNavigationIcon from './SidebarNavigationIcon';

describe('SidebarNavigationIcon', () => {
	it('보조 기술에서 숨겨진 장식용 아이콘을 제공한다', () => {
		const { container } = render(<SidebarNavigationIcon />);

		expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
	});
});
