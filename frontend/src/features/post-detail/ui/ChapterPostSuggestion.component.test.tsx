import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CologChapterPostSuggestions } from '@/features/post-detail/model/chapter';

import ChapterPostSuggestion from './ChapterPostSuggestion';

const CHAPTER: CologChapterPostSuggestions = {
	id: 7,
	name: '프론트엔드',
	posts: [
		{
			id: 1,
			title: '게시글 1',
			thumbnailUrl: null,
			author: { slug: 'author-1', nickname: '작성자 1' },
		},
		{
			id: 2,
			title: '게시글 2',
			thumbnailUrl: '/post-2.png',
			author: { slug: 'author-2', nickname: '작성자 2' },
		},
	],
};

describe('ChapterPostSuggestion', () => {
	it('전달받은 챕터 게시글을 각 탐색 경로와 함께 표시한다', () => {
		render(<ChapterPostSuggestion slug="rilog-team" chapter={CHAPTER} />);

		expect(screen.getByRole('heading', { name: '프론트엔드 챕터의 더 많은 글' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '프론트엔드' })).toHaveAttribute('href', '/@rilog-team?chapter=7');
		expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
		expect(screen.getByRole('link', { name: '게시글 1' })).toHaveAttribute('href', '/@rilog-team/posts/1');
		expect(screen.getByRole('link', { name: '작성자 1' })).toHaveAttribute('href', '/@author-1');
	});

	it('썸네일이 없으면 기본 게시글 이미지를 사용한다', () => {
		render(<ChapterPostSuggestion slug="rilog-team" chapter={CHAPTER} />);

		const thumbnail = screen.getByRole('img', { name: '게시글 1 썸네일' });
		expect(new URL(thumbnail.getAttribute('src')!, 'http://localhost').pathname).toBe('/images/thumbnail-fallback.svg');
	});
});
