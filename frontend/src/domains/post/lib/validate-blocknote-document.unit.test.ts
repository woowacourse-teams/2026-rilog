import { describe, expect, it } from 'vitest';

import { POST_DETAIL_READABILITY_CONTENT } from '@/test/fixtures/post-detail';

import { isBlockNoteDocument } from './validate-blocknote-document';

describe('isBlockNoteDocument', () => {
	const image = (id: string) => ({
		id,
		type: 'image',
		props: {
			backgroundColor: 'default',
			textAlignment: 'left',
			name: id,
			url: `https://example.com/${id}.png`,
			caption: '',
			showPreview: true,
		},
		children: [],
	});
	const column = (id: string, children: unknown[] = [image(id)]) => ({
		id: `column-${id}`,
		type: 'column',
		props: { width: 1 },
		children,
	});
	const row = (children: unknown[]) => ({
		id: 'image-row',
		type: 'columnList',
		props: {},
		children,
	});

	it('이미지 하나씩 담긴 2~3열 행을 허용한다', () => {
		expect(isBlockNoteDocument([row([column('first'), column('second')])])).toBe(true);
		expect(isBlockNoteDocument([row([column('first'), column('second'), column('third')])])).toBe(true);
	});

	it('빈 열, 여러 이미지, 이미지 외 블록과 1열·4열 행을 거부한다', () => {
		const paragraph = {
			id: 'text',
			type: 'paragraph',
			props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
			content: [],
			children: [],
		};
		const first = column('first');
		const second = column('second');
		expect(isBlockNoteDocument([row([first])])).toBe(false);
		expect(isBlockNoteDocument([row([first, second, column('third'), column('fourth')])])).toBe(false);
		expect(isBlockNoteDocument([row([column('empty', []), second])])).toBe(false);
		expect(isBlockNoteDocument([row([column('mixed', [image('one'), image('two')]), second])])).toBe(false);
		expect(isBlockNoteDocument([row([column('text', [paragraph]), second])])).toBe(false);
		expect(
			isBlockNoteDocument([row([column('nested', [{ ...image('nested'), children: [paragraph] }]), second])]),
		).toBe(false);
		expect(isBlockNoteDocument([row([first, { ...second, props: { width: 0 } }])])).toBe(false);
		expect(isBlockNoteDocument([column('orphan')])).toBe(false);
		expect(isBlockNoteDocument([{ ...paragraph, children: [row([first, second])] }])).toBe(false);
	});

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
