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

		const avatar = screen.getByRole('img', { name: 'Rilog 프로필' });
		expect(avatar).toHaveTextContent('R');
		expect(avatar).toHaveClass('border', 'border-border-default');
	});

	it('이미지 주소가 있으면 fallback 대신 프로필 이미지를 표시한다', () => {
		render(<Avatar src="https://example.com/profile.png" fallback="R" label="Rilog 프로필" />);

		const avatar = screen.getByRole('img', { name: 'Rilog 프로필' });

		expect(avatar).not.toHaveTextContent('R');
		expect(avatar.querySelector('img')).toHaveAttribute('src', 'https://example.com/profile.png');
	});
});
