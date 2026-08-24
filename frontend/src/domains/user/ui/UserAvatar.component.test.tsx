import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UserAvatar from './UserAvatar';

describe('UserAvatar', () => {
	it('사용자 이름을 제공하면 독립적인 이미지로 노출한다', () => {
		render(<UserAvatar fallback="R" label="Rilog 사용자" />);

		expect(screen.getByRole('img', { name: 'Rilog 사용자' })).toHaveTextContent('R');
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});
});
