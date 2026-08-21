import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ImagePreview from './ImagePreview';

describe('ImagePreview', () => {
	it('선택한 이미지를 접근 가능한 이름과 함께 보여준다', () => {
		render(<ImagePreview src="/profile.png" alt="프로필 이미지 미리보기" shape="circle" />);

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toBeInTheDocument();
	});

	it('이미지가 없으면 전달받은 fallback을 보여준다', () => {
		render(
			<ImagePreview
				alt="프로필 이미지 미리보기"
				shape="square"
				fallback={<span role="img" aria-label="기본 프로필 이미지" />}
			/>,
		);

		expect(screen.getByRole('img', { name: '기본 프로필 이미지' })).toBeInTheDocument();
		expect(screen.queryByRole('img', { name: '프로필 이미지 미리보기' })).not.toBeInTheDocument();
	});

	it('오류 상태면 danger 테두리를 보여준다', () => {
		render(<ImagePreview src="/profile.png" alt="프로필 이미지 미리보기" status="error" />);

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' }).parentElement).toHaveClass('border-danger');
	});
});
