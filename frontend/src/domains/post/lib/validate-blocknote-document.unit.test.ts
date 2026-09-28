import { describe, expect, it } from 'vitest';

import { POST_DETAIL_READABILITY_CONTENT } from '@/features/post-detail/model/post-detail.mock';

import { isBlockNoteDocument } from './validate-blocknote-document';

describe('isBlockNoteDocument', () => {
	it('편집기 스키마의 중첩 목록, 링크, 코드와 표를 포함한 저장 문서를 보존한다', () => {
		const serializedDocument: unknown = JSON.parse(JSON.stringify(POST_DETAIL_READABILITY_CONTENT));
		expect(isBlockNoteDocument(serializedDocument)).toBe(true);
	});

	it('정상적으로 비어 있는 문서는 허용한다', () => {
		expect(isBlockNoteDocument([])).toBe(true);
	});

	it('편집기에서 지원하는 6단계 제목을 유지한다', () => {
		expect(
			isBlockNoteDocument([
				{
					id: 'heading-6',
					type: 'heading',
					props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left', level: 6 },
					content: [],
					children: [],
				},
			]),
		).toBe(true);
	});

	it('미디어와 구분선의 생략된 content, 표 셀의 두 저장 형태를 허용한다', () => {
		const text = { type: 'text', text: '셀', styles: {} };
		const fileProps = { backgroundColor: 'default', name: '사진', url: 'https://example.com/photo.png', caption: '' };
		expect(
			isBlockNoteDocument([
				{ id: 'image', type: 'image', props: { ...fileProps, textAlignment: 'left', showPreview: true }, children: [] },
				{ id: 'video', type: 'video', props: { ...fileProps, textAlignment: 'left', showPreview: true }, children: [] },
				{ id: 'audio', type: 'audio', props: { ...fileProps, showPreview: true }, children: [] },
				{ id: 'file', type: 'file', props: fileProps, children: [] },
				{ id: 'divider', type: 'divider', props: {}, children: [] },
				{
					id: 'table',
					type: 'table',
					props: { textColor: 'default' },
					children: [],
					content: {
						type: 'tableContent',
						columnWidths: [null, 200],
						rows: [
							{
								cells: [
									[text],
									{
										type: 'tableCell',
										props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
										content: [text],
									},
								],
							},
						],
					},
				},
			]),
		).toBe(true);
	});

	it.each([null, {}, '[]', [{ id: '1', type: 'unknown', props: {}, content: [], children: [] }]])(
		'본문 전체 또는 알 수 없는 블록을 거부한다',
		(value) => {
			expect(isBlockNoteDocument(value)).toBe(false);
		},
	);

	it('중첩 본문과 인라인 콘텐츠의 손상을 거부한다', () => {
		const paragraph = {
			id: '1',
			type: 'paragraph',
			props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
			content: [],
			children: [],
		};
		expect(isBlockNoteDocument([{ ...paragraph, children: [null] }])).toBe(false);
		expect(isBlockNoteDocument([{ ...paragraph, content: [{ type: 'link', href: '/docs', content: [null] }] }])).toBe(
			false,
		);
		expect(
			isBlockNoteDocument([{ ...paragraph, content: [{ type: 'text', text: '내용', styles: { bold: 'yes' } }] }]),
		).toBe(false);
	});

	it('표 셀과 미디어 속성의 손상을 거부한다', () => {
		expect(
			isBlockNoteDocument([
				{
					id: 'table',
					type: 'table',
					props: { textColor: 'default' },
					content: {
						type: 'tableContent',
						columnWidths: [null],
						rows: [{ cells: [[{ type: 'text', text: 3, styles: {} }]] }],
					},
					children: [],
				},
			]),
		).toBe(false);
		expect(
			isBlockNoteDocument([
				{
					id: 'image',
					type: 'image',
					props: {
						backgroundColor: 'default',
						textAlignment: 'left',
						name: '',
						url: 3,
						caption: '',
						showPreview: true,
					},
					content: [],
					children: [],
				},
			]),
		).toBe(false);
	});
});
