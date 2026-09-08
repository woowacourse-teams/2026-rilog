import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CologChapterPostSuggestions } from '@/features/post-detail/model/chapter';

import ChapterPostSuggestionSection from './ChapterPostSuggestionSection';

const createChapter = (postCount: number): CologChapterPostSuggestions => ({
	id: 7,
	name: '프론트엔드',
	posts: Array.from({ length: postCount }, (_, index) => ({
		id: index + 1,
		title: `게시글 ${index + 1}`,
		thumbnailUrl: index === 0 ? null : `/post-${index + 1}.png`,
		author: { slug: `author-${index + 1}`, nickname: `작성자 ${index + 1}` },
	})),
});

describe('ChapterPostSuggestionSection', () => {
	it('챕터와 최대 3개의 게시글을 각 탐색 경로와 함께 표시한다', () => {
		render(<ChapterPostSuggestionSection slug="rilog-team" chapter={createChapter(4)} />);

		expect(screen.getByRole('heading', { name: '프론트엔드 챕터의 더 많은 글' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '프론트엔드' })).toHaveAttribute('href', '/@rilog-team?chapter=7');
		expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
		expect(screen.getByRole('link', { name: /게시글 1/ })).toHaveAttribute('href', '/@rilog-team/posts/1');
		expect(screen.getByRole('link', { name: '작성자 1' })).toHaveAttribute('href', '/@author-1');
		expect(screen.queryByRole('heading', { name: '게시글 4' })).not.toBeInTheDocument();
	});

	it('썸네일이 없으면 기본 게시글 이미지를 사용한다', () => {
		render(<ChapterPostSuggestionSection slug="rilog-team" chapter={createChapter(1)} />);

		const thumbnail = screen.getByRole('img', { name: '게시글 1 썸네일' });
		expect(new URL(thumbnail.getAttribute('src')!, 'http://localhost').pathname).toBe('/images/thumbnail-fallback.svg');
	});

	it('제안할 글이 0개면 섹션을 노출하지 않는다', () => {
		render(<ChapterPostSuggestionSection slug="rilog-team" chapter={createChapter(0)} />);

		expect(screen.queryByRole('region')).not.toBeInTheDocument();
	});
});
