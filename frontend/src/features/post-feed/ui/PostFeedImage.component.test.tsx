import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PostFeedImage from './PostFeedImage';

describe('PostFeedImage', () => {
	it('원본 이미지가 실패하면 전달받은 fallback으로 교체한다', () => {
		render(
			<PostFeedImage
				src="https://images.rilog.test/post.png"
				fallbackSrc="/images/thumbnail-fallback.svg"
				alt="게시글 썸네일"
				width={640}
				height={360}
			/>,
		);
		const image = screen.getByRole('img', { name: '게시글 썸네일' });

		fireEvent.error(image);

		expect(image).toHaveAttribute('src', expect.stringContaining('thumbnail-fallback.svg'));
	});

	it('원본 주소가 없으면 처음부터 fallback을 표시한다', () => {
		render(<PostFeedImage src={null} alt="게시글 썸네일" width={640} height={360} />);

		expect(screen.getByRole('img', { name: '게시글 썸네일' })).toHaveAttribute(
			'src',
			expect.stringContaining('logo.svg'),
		);
	});
});
