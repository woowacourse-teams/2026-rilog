import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UserAvatar from './UserAvatar';

describe('UserAvatar', () => {
	it('사용자 이름을 제공하면 독립적인 이미지로 노출한다', () => {
		render(<UserAvatar fallback="R" label="Rilog 사용자" size="sm" />);

		expect(screen.getByRole('img', { name: 'Rilog 사용자' })).toHaveTextContent('R');
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('size prop에 맞는 기본 sizes를 전달한다', () => {
		render(
			<UserAvatar
				src="https://cdn.rilog.test/profiles/raw/user-123/original.png"
				fallback="R"
				label="Rilog 사용자"
				size="sm"
			/>,
		);

		const img = screen.getByRole('img', { name: 'Rilog 사용자' }).querySelector('img');
		expect(img?.getAttribute('sizes')).toBe('24px');
	});
});
