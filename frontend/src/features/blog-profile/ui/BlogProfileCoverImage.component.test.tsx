import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BlogProfileCoverImage from './BlogProfileCoverImage';

describe('BlogProfileCoverImage', () => {
	it('이미지를 불러오지 못하면 렌더링을 중단해 hero 기본 배경을 드러낸다', () => {
		const { container } = render(
			<BlogProfileCoverImage src="https://images.rilog.test/cover.png" alt="리로그 커버 이미지" />,
		);

		expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();

		fireEvent.error(screen.getByRole('img', { name: '리로그 커버 이미지' }));

		expect(screen.queryByRole('img', { name: '리로그 커버 이미지' })).not.toBeInTheDocument();
	});
});
