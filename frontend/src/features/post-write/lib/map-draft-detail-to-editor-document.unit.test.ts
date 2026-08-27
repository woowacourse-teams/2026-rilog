import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { mapDraftDetailToEditorDocument } from './map-draft-detail-to-editor-document';

const block: Block = {
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: [],
	children: [],
};

describe('mapDraftDetailToEditorDocument', () => {
	it('제목과 배열 content를 에디터 문서로 변환한다', () => {
		expect(
			mapDraftDetailToEditorDocument({
				draftId: 42,
				title: '불러온 임시저장 제목',
				content: [block],
				status: 'DRAFT',
				publishedAt: '2026-08-27T10:42:11.852Z',
			}),
		).toEqual({ title: '불러온 임시저장 제목', blocks: [block] });
	});

	it('content가 배열이 아니면 빈 본문으로 변환한다', () => {
		expect(
			mapDraftDetailToEditorDocument({
				draftId: 42,
				title: '본문이 없는 임시저장',
				content: null,
				status: 'DRAFT',
				publishedAt: '2026-08-27T10:42:11.852Z',
			}),
		).toEqual({ title: '본문이 없는 임시저장', blocks: [] });
	});
});
