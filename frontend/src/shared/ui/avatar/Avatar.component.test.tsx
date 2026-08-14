import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Avatar from './Avatar';

describe('Avatar', () => {
	it('주변 요소가 이름을 제공하면 접근성 트리에서 숨길 수 있다', () => {
		const { container } = render(<Avatar fallback="R" />);

		expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('R');
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it('독립적으로 사용하면 접근 가능한 이름을 제공한다', () => {
		render(<Avatar fallback="R" label="Rilog 프로필" />);

		expect(screen.getByRole('img', { name: 'Rilog 프로필' })).toHaveTextContent('R');
	});
});
