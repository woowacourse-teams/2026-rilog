import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CologChapter } from '../model/colog-chapter';

import { useCologChapterDrafts } from './use-colog-chapter-drafts';

interface HookProps {
	initialChapters?: CologChapter[];
}

const CHAPTER: CologChapter = {
	id: 7,
	name: '프론트엔드',
	postCount: 3,
};

describe('useCologChapterDrafts', () => {
	it('비동기로 도착한 최초 챕터 목록을 초기 상태에 반영한다', () => {
		const initialProps: HookProps = { initialChapters: undefined };
		const { result, rerender } = renderHook(
			({ initialChapters }: HookProps) => useCologChapterDrafts({ initialChapters }),
			{ initialProps },
		);

		expect(result.current.chapters).toEqual([]);

		rerender({ initialChapters: [CHAPTER] });

		expect(result.current.chapters).toEqual([CHAPTER]);
	});

	it('챕터 이름 변경을 draft에 보관하고 저장할 때만 목록에 반영한다', () => {
		const { result } = renderHook(() => useCologChapterDrafts({ initialChapters: [CHAPTER] }));

		act(() => {
			result.current.handleStartEditing();
			result.current.handleNameChange(CHAPTER.id, '플랫폼');
		});

		expect(result.current.chapters[0].name).toBe('프론트엔드');
		expect(result.current.displayedChapters[0].name).toBe('플랫폼');
		expect(result.current.isDirty).toBe(true);

		act(() => result.current.handleSave());

		expect(result.current.chapters[0].name).toBe('플랫폼');
		expect(result.current.isEditing).toBe(false);
	});
});
