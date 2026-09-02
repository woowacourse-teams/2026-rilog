import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Chapter } from '../model/chapter';

import { useChapterDrafts } from './use-chapter-drafts';

interface HookProps {
	initialChapters?: Chapter[];
}

const CHAPTER: Chapter = {
	id: 7,
	name: '프론트엔드',
	postCount: 3,
};

describe('useChapterDrafts', () => {
	it('비동기로 도착한 최초 챕터 목록을 초기 상태에 반영한다', () => {
		const initialProps: HookProps = { initialChapters: undefined };
		const { result, rerender } = renderHook(({ initialChapters }: HookProps) => useChapterDrafts({ initialChapters }), {
			initialProps,
		});

		expect(result.current.chapters).toEqual([]);

		rerender({ initialChapters: [CHAPTER] });

		expect(result.current.chapters).toEqual([CHAPTER]);
	});

	it('챕터 이름 변경을 draft에 보관하고 저장할 때만 목록에 반영한다', () => {
		const { result } = renderHook(() => useChapterDrafts({ initialChapters: [CHAPTER] }));

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

	it('공백뿐인 이름은 저장하지 않고, 저장할 이름은 공백을 제거한다', () => {
		const { result } = renderHook(() => useChapterDrafts({ initialChapters: [CHAPTER] }));

		act(() => {
			result.current.handleStartEditing();
			result.current.handleNameChange(CHAPTER.id, '   ');
		});
		act(() => result.current.handleSave());

		expect(result.current.chapters[0].name).toBe('프론트엔드');
		expect(result.current.isEditing).toBe(true);

		act(() => {
			result.current.handleNameChange(CHAPTER.id, ' 플랫폼 ');
		});
		act(() => result.current.handleSave());

		expect(result.current.chapters[0].name).toBe('플랫폼');
		expect(result.current.isEditing).toBe(false);
	});

	it('저장에 성공한 챕터만 반영하고 실패한 챕터 draft는 유지한다', () => {
		const otherChapter: Chapter = { id: 8, name: '백엔드' };
		const { result } = renderHook(() => useChapterDrafts({ initialChapters: [CHAPTER, otherChapter] }));

		act(() => {
			result.current.handleStartEditing();
			result.current.handleNameChange(CHAPTER.id, '웹');
			result.current.handleNameChange(otherChapter.id, '서버');
		});
		act(() => result.current.handleSaveChapters([CHAPTER.id]));

		expect(result.current.chapters).toEqual([{ ...CHAPTER, name: '웹' }, otherChapter]);
		expect(result.current.draftChapters).toEqual([{ id: otherChapter.id, name: '서버' }]);
		expect(result.current.isEditing).toBe(true);
	});
});
