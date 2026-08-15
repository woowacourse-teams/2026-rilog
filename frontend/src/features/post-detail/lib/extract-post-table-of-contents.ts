import type { Block, DefaultInlineContentSchema, DefaultStyleSchema, InlineContent } from '@blocknote/core';

export interface PostTableOfContentsItem {
	id: string;
	text: string;
	level: 1 | 2 | 3;
}

type PostInlineContent = InlineContent<DefaultInlineContentSchema, DefaultStyleSchema>;

const extractInlineText = (content: PostInlineContent[]): string =>
	content
		.map((item) => (item.type === 'text' ? item.text : item.content.map((linkedText) => linkedText.text).join('')))
		.join('');

// h1부터 h3까지 추출
export const extractPostTableOfContents = (blocks: Block[]): PostTableOfContentsItem[] => {
	const items: PostTableOfContentsItem[] = [];

	// 재귀로 목차 탑색
	const visit = (currentBlocks: Block[]) => {
		currentBlocks.forEach((block) => {
			if (block.type === 'heading' && (block.props.level === 1 || block.props.level === 2 || block.props.level === 3)) {
				const text = extractInlineText(block.content).trim();

				if (text.length > 0) {
					items.push({ id: block.id, text, level: block.props.level });
				}
			}

			visit(block.children);
		});
	};

	visit(blocks);

	return items;
};
