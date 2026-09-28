// @vitest-environment jsdom
import { BlockNoteEditor } from '@blocknote/core';
import { expect, it } from 'vitest';

import { isBlockNoteDocument } from '@/domains/post/lib/validate-blocknote-document';
import { POST_DETAIL_READABILITY_CONTENT } from '@/features/post-detail/model/post-detail.mock';

import { POST_WRITE_SCHEMA } from './post-write-schema';

const createDocument = (
	initialContent: NonNullable<Parameters<typeof BlockNoteEditor.create>[0]>['initialContent'],
) => {
	const editor = BlockNoteEditor.create({ schema: POST_WRITE_SCHEMA, initialContent });
	try {
		return JSON.parse(JSON.stringify(editor.document)) as unknown;
	} finally {
		editor.unmount();
	}
};

it('운영 편집기가 생성한 기본 문서와 기존 저장 fixture를 본문 가드가 허용한다', () => {
	const editor = BlockNoteEditor.create({ schema: POST_WRITE_SCHEMA });
	try {
		expect(isBlockNoteDocument(JSON.parse(JSON.stringify(editor.document)))).toBe(true);
	} finally {
		editor.unmount();
	}
	expect(isBlockNoteDocument(createDocument(POST_DETAIL_READABILITY_CONTENT))).toBe(true);
	expect(isBlockNoteDocument([])).toBe(true);
});

it('운영 편집기의 제목 1~6과 중첩 목록·링크·인라인 스타일을 허용한다', () => {
	for (const level of [1, 2, 3, 4, 5, 6] as const) {
		expect(isBlockNoteDocument(createDocument([{ type: 'heading', props: { level }, content: '제목' }]))).toBe(true);
	}
	expect(
		isBlockNoteDocument(
			createDocument([
				{
					type: 'bulletListItem',
					content: [
						{ type: 'link', href: '/docs', content: '문서' },
						{ type: 'text', text: ' 강조', styles: { bold: true } },
					],
					children: [{ type: 'numberedListItem', content: '중첩 목록' }],
				},
			]),
		),
	).toBe(true);
});

it('운영 편집기의 코드·표·미디어·구분선을 허용한다', () => {
	expect(
		isBlockNoteDocument(
			createDocument([
				{ type: 'codeBlock', props: { language: 'typescript' }, content: 'const value = 1;' },
				{ type: 'table', content: { type: 'tableContent', rows: [{ cells: [['셀']] }], columnWidths: [200] } },
				{ type: 'image', props: { url: 'https://example.com/a.png', name: '이미지' } },
				{ type: 'video', props: { url: 'https://example.com/a.mp4', name: '동영상' } },
				{ type: 'audio', props: { url: 'https://example.com/a.mp3', name: '소리' } },
				{ type: 'file', props: { url: 'https://example.com/a.pdf', name: '파일' } },
				{ type: 'divider' },
			]),
		),
	).toBe(true);
});
