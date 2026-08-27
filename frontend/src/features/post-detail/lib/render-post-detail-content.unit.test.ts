import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { POST_DETAIL_READABILITY_CONTENT } from '../model/post-detail.mock';

import { renderPostDetailContent } from './render-post-detail-content';

const IMAGE_BLOCK: Block = {
	id: 'image-block',
	type: 'image',
	props: {
		backgroundColor: 'default',
		caption: '',
		name: '',
		previewWidth: 512,
		showPreview: true,
		textAlignment: 'left',
		url: 'https://images.rilog.test/post.png',
	},
	content: undefined,
	children: [],
};

const DEFAULT_TEXT_PROPS = {
	backgroundColor: 'default',
	textAlignment: 'left',
	textColor: 'default',
} as const;

const text = (value: string) => [{ type: 'text' as const, text: value, styles: {} }];

const code = (id: string, value: string, language: string): Block => ({
	id,
	type: 'codeBlock',
	props: { language },
	content: text(value),
	children: [],
});

const HEADING_BLOCKS: Block[] = [
	{
		id: 'heading-level-1',
		type: 'heading',
		props: { ...DEFAULT_TEXT_PROPS, level: 1, isToggleable: false },
		content: text('첫 번째 제목'),
		children: [],
	},
	{
		id: 'heading-level-2',
		type: 'heading',
		props: { ...DEFAULT_TEXT_PROPS, level: 2, isToggleable: false },
		content: text('두 번째 제목'),
		children: [],
	},
	{
		id: 'heading-level-3',
		type: 'heading',
		props: { ...DEFAULT_TEXT_PROPS, level: 3, isToggleable: false },
		content: text('세 번째 제목'),
		children: [],
	},
	{
		id: 'paragraph-block',
		type: 'paragraph',
		props: DEFAULT_TEXT_PROPS,
		content: text('본문'),
		children: [],
	},
];

const TOGGLE_BLOCKS: Block[] = [
	{
		id: 'toggle-heading',
		type: 'heading',
		props: { ...DEFAULT_TEXT_PROPS, level: 2, isToggleable: true },
		content: text('토글 제목'),
		children: [
			{
				id: 'nested-toggle',
				type: 'toggleListItem',
				props: DEFAULT_TEXT_PROPS,
				content: text('중첩 토글'),
				children: [
					{
						id: 'nested-content',
						type: 'paragraph',
						props: DEFAULT_TEXT_PROPS,
						content: text('중첩 내용'),
						children: [],
					},
				],
			},
		],
	},
];

describe('renderPostDetailContent', () => {
	it('가독성 점검 fixture의 주요 블록과 안전한 코드 원문을 정적 HTML로 변환한다', async () => {
		const html = await renderPostDetailContent(POST_DETAIL_READABILITY_CONTENT);

		expect(html).toContain('data-content-type="heading"');
		expect(html).toContain('data-content-type="bulletListItem"');
		expect(html).toContain('data-content-type="numberedListItem"');
		expect(html).toContain('data-content-type="checkListItem"');
		expect(html).toContain('data-content-type="quote"');
		expect(html).toContain('data-content-type="table"');
		expect(html).toContain('data-content-type="toggleListItem"');
		expect(html).toContain('data-content-type="image"');
		expect(html).toContain('href="https://www.rilog.dev/docs/architecture"');
		expect(html).toContain('data-language="typescript"');
		expect(html).toContain('data-language="unknown-language"');
		expect(html.match(/data-post-code-highlighted=""/g)).toHaveLength(2);
		expect(html).toContain('style="color:var(--code-syntax-token-keyword)"');
		expect(html).toContain('&lt;script&gt;alert("escaped")&lt;/script&gt;');
		expect(html).not.toContain('<script>alert("escaped")</script>');
	});

	it('지원 언어만 하이라이팅하고 일반 텍스트와 알 수 없는 언어는 원문으로 유지한다', async () => {
		const source = 'const message: string = "<script>unsafe</script>";';
		const html = await renderPostDetailContent([
			code('typescript-code', source, 'typescript'),
			code('plain-code', source, 'text'),
			code('unknown-code', source, 'unknown-language'),
		]);

		expect(html.match(/data-post-code-highlighted=""/g)).toHaveLength(1);
		expect(html).toContain('<span class="line">');
		expect(html).not.toContain('<script>unsafe</script>');
		expect(html.match(/&lt;script&gt;unsafe&lt;\/script&gt;/g)).toHaveLength(3);
	});

	it('이미지 블록을 정적 HTML 이미지로 변환한다', async () => {
		const html = await renderPostDetailContent([IMAGE_BLOCK]);

		expect(html).toContain('<img');
		expect(html).toContain('src="https://images.rilog.test/post.png"');
	});

	it('목차 대상 헤딩의 바깥 블록에 고유한 DOM id를 부여한다', async () => {
		const html = await renderPostDetailContent(HEADING_BLOCKS);
		const expectedHeadingIds = ['첫-번째-제목', '두-번째-제목', '세-번째-제목'];

		expectedHeadingIds.forEach((headingId, index) => {
			expect(html).toMatch(
				new RegExp(`class="bn-block-outer"[^>]*data-id="heading-level-${index + 1}"[^>]*id="${headingId}"`),
			);
			expect(html.match(new RegExp(`\\sid="${headingId}"`, 'g'))).toHaveLength(1);
		});
		expect(html).not.toMatch(/\sid="paragraph-block"/);
	});

	it('토글 블록을 접힌 접근 가능한 마크업으로 변환한다', async () => {
		const blocks = structuredClone(TOGGLE_BLOCKS);
		const html = await renderPostDetailContent(blocks);

		expect(html.match(/class="bn-toggle-wrapper" data-show-children="false"/g)).toHaveLength(2);
		expect(html.match(/data-post-detail-toggle=""/g)).toHaveLength(2);
		expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
		expect(html).toContain('aria-controls="post-detail-toggle-content-0"');
		expect(html).toContain('aria-controls="post-detail-toggle-content-1"');
		expect(blocks).toEqual(TOGGLE_BLOCKS);
	});
});
