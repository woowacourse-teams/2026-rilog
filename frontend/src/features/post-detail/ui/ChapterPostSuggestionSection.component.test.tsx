import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getChapterPostSuggestions } from '@/features/post-detail/lib/get-chapter-post-suggestions';

import ChapterPostSuggestionSection from './ChapterPostSuggestionSection';

vi.mock('@/features/post-detail/lib/get-chapter-post-suggestions');

const CHAPTER = { id: 7, name: '프론트엔드', order: 1 };

describe('ChapterPostSuggestionSection', () => {
	beforeEach(() => {
		vi.mocked(getChapterPostSuggestions).mockReset();
	});

	it('서버에서 조회한 챕터 게시글을 추천 UI에 전달한다', async () => {
		vi.mocked(getChapterPostSuggestions).mockResolvedValue({
			id: 7,
			name: '프론트엔드',
			posts: [
				{
					id: 1,
					title: '서버 컴포넌트 설계',
					thumbnailUrl: null,
					author: { slug: 'rilogger', nickname: '리로거' },
				},
			],
		});

		render(await ChapterPostSuggestionSection({ slug: 'rilog-team', chapter: CHAPTER, currentPostId: 65 }));

		expect(getChapterPostSuggestions).toHaveBeenCalledWith({
			slug: 'rilog-team',
			chapter: CHAPTER,
			currentPostId: 65,
		});
		expect(screen.getByRole('heading', { name: '서버 컴포넌트 설계' })).toBeInTheDocument();
	});

	it('조회 결과가 없으면 추천 영역을 렌더링하지 않는다', async () => {
		vi.mocked(getChapterPostSuggestions).mockResolvedValue(null);

		const { container } = render(
			await ChapterPostSuggestionSection({ slug: 'rilog-team', chapter: CHAPTER, currentPostId: 65 }),
		);

		expect(container).toBeEmptyDOMElement();
	});

	it('현재 글을 필터링한 뒤 추천 게시글이 없으면 추천 영역을 렌더링하지 않는다', async () => {
		vi.mocked(getChapterPostSuggestions).mockResolvedValue({
			id: 7,
			name: '프론트엔드',
			posts: [],
		});

		const { container } = render(
			await ChapterPostSuggestionSection({ slug: 'rilog-team', chapter: CHAPTER, currentPostId: 65 }),
		);

		expect(container).toBeEmptyDOMElement();
	});
});
