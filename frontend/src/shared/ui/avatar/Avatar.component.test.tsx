import { fireEvent, render, screen } from '@testing-library/react';
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
	});

	it('이미지 주소가 있으면 fallback 대신 프로필 이미지를 표시한다', () => {
		render(<Avatar src="https://example.com/profile.png" fallback="R" label="Rilog 프로필" />);

		const avatar = screen.getByRole('img', { name: 'Rilog 프로필' });

		expect(avatar).not.toHaveTextContent('R');
		expect(avatar.querySelector('img')).toHaveAttribute('src', 'https://example.com/profile.png');
	});

	it('이미지 로드 실패 후 src가 바뀌면 새 프로필 이미지를 표시한다', () => {
		const firstUrl = 'https://example.com/first.png';
		const nextUrl = 'https://example.com/next.png';
		const { rerender } = render(<Avatar src={firstUrl} fallback="R" label="Rilog 프로필" />);
		const avatar = screen.getByRole('img', { name: 'Rilog 프로필' });

		fireEvent.error(avatar.querySelector('img')!);
		expect(avatar).toHaveTextContent('R');

		rerender(<Avatar src={nextUrl} fallback="R" label="Rilog 프로필" />);
		expect(avatar.querySelector('img')).toHaveAttribute('src', nextUrl);
		expect(avatar).not.toHaveTextContent('R');
	});

	it('신경로 프로필 주소는 compact srcset을 렌더링하고 sizes 속성을 전달받을 수 있다', () => {
		render(
			<Avatar
				src="https://cdn.rilog.test/profiles/raw/user-123/original.png"
				fallback="R"
				label="Rilog 프로필"
				sizes="32px"
			/>,
		);

		const img = screen.getByRole('img', { name: 'Rilog 프로필' }).querySelector('img');
		expect(img?.getAttribute('srcset')).toContain('https://cdn.rilog.test/profiles/compact/user-123/50.webp 50w');
		expect(img?.getAttribute('sizes')).toBe('32px');
	});
});
