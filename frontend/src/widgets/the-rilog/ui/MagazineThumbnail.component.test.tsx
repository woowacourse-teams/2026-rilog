import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MagazineThumbnail from './MagazineThumbnail';

describe('MagazineThumbnail', () => {
	it('썸네일이 없으면 깨진 이미지를 만들지 않는다', () => {
		const { container } = render(<MagazineThumbnail src={null} />);
		expect(container.querySelector('img')).toBeNull();
	});

	it('실제 이미지가 로드에 실패하면 장식용 대체 표현으로 바꾼다', () => {
		const { container } = render(<MagazineThumbnail src="https://images.example.com/article.jpg" />);
		const image = container.querySelector('img');
		expect(image).toHaveAttribute('alt', '');
		fireEvent.error(image!);
		expect(container.querySelector('img')).toBeNull();
	});
});
