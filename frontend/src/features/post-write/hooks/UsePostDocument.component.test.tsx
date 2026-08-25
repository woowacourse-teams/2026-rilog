import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { EditorDocument } from '../model/post-publication';
import type { Block } from '@blocknote/core';

import { usePostDocument } from './use-post-document';

const createParagraph = (text = ''): Block => ({
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: text.length > 0 ? [{ type: 'text', text, styles: {} }] : [],
	children: [],
});

describe('usePostDocument', () => {
	it('초기 문서를 dirty로 취급하지 않고 최신 editor blocks로 발행 snapshot을 만든다', () => {
		const initialBlocks = [createParagraph('초기 본문')];
		const changedBlocks = [createParagraph('변경한 본문')];
		const { result } = renderHook(() =>
			usePostDocument({ initialDocument: { title: '  초기 제목  ', blocks: initialBlocks } }),
		);

		expect(result.current.title).toBe('  초기 제목  ');
		expect(result.current.isDirty).toBe(false);

		act(() => result.current.handleEditorReady(changedBlocks));
		expect(result.current.isEditorReady).toBe(true);

		const preparedDocument = { current: null as EditorDocument | null };
		act(() => {
			preparedDocument.current = result.current.preparePostDocument();
		});

		expect(preparedDocument.current).toEqual({ title: '초기 제목', blocks: changedBlocks });
		expect(preparedDocument.current?.blocks).not.toBe(changedBlocks);
	});

	it('유효하지 않은 문서 오류를 저장하고 필드 변경 시 해당 오류만 해제한다', () => {
		const { result } = renderHook(() => usePostDocument());

		act(() => {
			expect(result.current.preparePostDocument()).toBeNull();
		});
		expect(result.current.documentErrors).toEqual({
			title: '제목을 입력해 주세요.',
			body: '내용을 입력해 주세요.',
		});

		act(() => result.current.handleTitleChange('제목'));
		expect(result.current.documentErrors).toEqual({ body: '내용을 입력해 주세요.' });
		expect(result.current.isDirty).toBe(true);

		act(() => result.current.handleEditorChange([createParagraph('본문')]));
		expect(result.current.documentErrors).toEqual({});
	});

	it('문서를 변경한 뒤 완료 처리하면 dirty 상태를 해제한다', () => {
		const { result } = renderHook(() => usePostDocument());

		act(() => result.current.handleTitleChange('변경한 제목'));
		expect(result.current.isDirty).toBe(true);

		act(() => result.current.markClean());
		expect(result.current.isDirty).toBe(false);
	});
});
