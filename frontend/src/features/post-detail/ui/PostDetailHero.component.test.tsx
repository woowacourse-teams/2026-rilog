import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PostDetailHero from './PostDetailHero';

const getSourceImageUrl = (name: string) => {
	const optimizedImageUrl = screen.getByRole('img', { name }).getAttribute('src');
	if (optimizedImageUrl === null) return null;

	const parsedImageUrl = new URL(optimizedImageUrl, 'http://localhost');
	return parsedImageUrl.searchParams.get('url') ?? parsedImageUrl.pathname;
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

	it('썸네일이 없거나 로드에 실패하면 피드와 동일한 기본 이미지를 표시한다', () => {
		const { rerender } = render(<PostDetailHero title="이미지 없는 글" thumbnailUrl={null} />);

		expect(getSourceImageUrl('이미지 없는 글')).toBe('/images/team-cover-placeholder.png');

		rerender(<PostDetailHero title="실패한 이미지 글" thumbnailUrl="broken-thumbnail.png" />);
		fireEvent.error(screen.getByRole('img', { name: '실패한 이미지 글' }));

		expect(getSourceImageUrl('실패한 이미지 글')).toBe('/images/team-cover-placeholder.png');
	});
});
