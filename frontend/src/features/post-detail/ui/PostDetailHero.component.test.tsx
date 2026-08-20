import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostDetailHero from './PostDetailHero';

const getSourceImageUrl = (name: string) => {
	const optimizedImageUrl = screen.getByRole('img', { name }).getAttribute('src');

	return optimizedImageUrl === null ? null : new URL(optimizedImageUrl).searchParams.get('url');
};

describe('PostDetailHero', () => {
	beforeEach(() => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://images.rilog.test');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('객체 key로 받은 대표 이미지에 버킷 URL을 붙인다', () => {
		render(<PostDetailHero title="대표 이미지 글" thumbnailImageUrl="originals/post/thumbnail.png" />);

		expect(getSourceImageUrl('대표 이미지 글')).toBe('https://images.rilog.test/originals/post/thumbnail.png');
	});

	it('완성된 대표 이미지 URL은 그대로 사용한다', () => {
		render(<PostDetailHero title="외부 이미지 글" thumbnailImageUrl="https://cdn.rilog.test/thumbnail.png" />);

		expect(getSourceImageUrl('외부 이미지 글')).toBe('https://cdn.rilog.test/thumbnail.png');
	});

	it('대표 이미지가 없거나 로드에 실패하면 이미지 영역만 유지한다', () => {
		const { rerender } = render(<PostDetailHero title="이미지 없는 글" thumbnailImageUrl={null} />);

		expect(screen.queryByRole('img')).not.toBeInTheDocument();

		rerender(<PostDetailHero title="실패한 이미지 글" thumbnailImageUrl="broken-thumbnail.png" />);
		fireEvent.error(screen.getByRole('img', { name: '실패한 이미지 글' }));

		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});
});
