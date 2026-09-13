import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostDetailHero from './PostDetailHero';

const getSourceImageUrl = (name: string) => {
	const imageUrl = screen.getByRole('img', { name }).getAttribute('src');
	if (imageUrl === null) return null;

	const parsedImageUrl = new URL(imageUrl, 'http://localhost');
	const sourceImageUrl = new URL(parsedImageUrl.searchParams.get('url') ?? parsedImageUrl.href, 'http://localhost');

	return sourceImageUrl.origin === 'http://localhost' ? sourceImageUrl.pathname : sourceImageUrl.href;
};

describe('PostDetailHero', () => {
	beforeEach(() => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://images.rilog.test');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('객체 key로 받은 대표 이미지에 버킷 URL을 붙인다', () => {
		render(<PostDetailHero title="대표 이미지 글" thumbnailUrl="originals/post/thumbnail.png" />);

		expect(getSourceImageUrl('대표 이미지 글')).toBe('https://images.rilog.test/originals/post/thumbnail.png');
	});

	it('완성된 대표 이미지 URL은 그대로 사용한다', () => {
		render(<PostDetailHero title="외부 이미지 글" thumbnailUrl="https://cdn.rilog.test/thumbnail.png" />);

		expect(getSourceImageUrl('외부 이미지 글')).toBe('https://cdn.rilog.test/thumbnail.png');
	});

	it('썸네일이 없거나 fallback 이미지면 Hero를 렌더링하지 않는다', () => {
		const { rerender } = render(<PostDetailHero title="이미지 없는 글" thumbnailUrl={null} />);

		expect(screen.queryByRole('figure', { name: '이미지 없는 글 대표 이미지' })).not.toBeInTheDocument();

		rerender(<PostDetailHero title="fallback 이미지 글" thumbnailUrl="/images/thumbnail-fallback.svg" />);

		expect(screen.queryByRole('figure', { name: 'fallback 이미지 글 대표 이미지' })).not.toBeInTheDocument();
	});

	it('썸네일 로드에 실패하면 렌더링하던 Hero를 숨긴다', () => {
		render(<PostDetailHero title="실패한 이미지 글" thumbnailUrl="broken-thumbnail.png" />);

		expect(screen.getByRole('figure', { name: '실패한 이미지 글 대표 이미지' })).toBeInTheDocument();
		fireEvent.error(screen.getByRole('img', { name: '실패한 이미지 글' }));

		expect(screen.queryByRole('figure', { name: '실패한 이미지 글 대표 이미지' })).not.toBeInTheDocument();
	});
});
