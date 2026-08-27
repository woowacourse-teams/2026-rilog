import type { Block, DefaultInlineContentSchema, DefaultStyleSchema, InlineContent } from '@blocknote/core';

export interface PostTableOfContentsItem {
	id: string;
	text: string;
	level: 1 | 2 | 3;
}

export interface PostHeadingAnchor extends PostTableOfContentsItem {
	blockId: string;
}

type PostInlineContent = InlineContent<DefaultInlineContentSchema, DefaultStyleSchema>;

const extractInlineText = (content: PostInlineContent[]): string =>
	content
		.map((item) => (item.type === 'text' ? item.text : item.content.map((linkedText) => linkedText.text).join('')))
		.join('');

const createPostHeadingAnchorToken = (blockId: string): string => {
	let hash = 0x811c9dc5;

	for (let index = 0; index < blockId.length; index += 1) {
		hash ^= blockId.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}

	return (hash >>> 0).toString(36).padStart(7, '0');
};

const createPostHeadingAnchorId = (text: string, blockId: string, usedIds: Set<string>): string => {
	const baseId = text.normalize('NFC').replace(/\s+/g, '-');
	if (!usedIds.has(baseId)) {
		usedIds.add(baseId);
		return baseId;
	}

	const tokenId = `${baseId}-${createPostHeadingAnchorToken(blockId)}`;
	let id = tokenId;
	let suffix = 2;

	while (usedIds.has(id)) {
		id = `${tokenId}-${suffix}`;
		suffix += 1;
	}

	usedIds.add(id);

	return id;
};

// h1부터 h3까지 추출
export const extractPostHeadingAnchors = (blocks: Block[]): PostHeadingAnchor[] => {
	const anchors: PostHeadingAnchor[] = [];
	const usedIds = new Set<string>();

	// 재귀로 목차 탑색
	const visit = (currentBlocks: Block[]) => {
		currentBlocks.forEach((block) => {
			if (block.type === 'heading' && (block.props.level === 1 || block.props.level === 2 || block.props.level === 3)) {
				const text = extractInlineText(block.content).trim();

				if (text.length > 0) {
					anchors.push({
						blockId: block.id,
						id: createPostHeadingAnchorId(text, block.id, usedIds),
						text,
						level: block.props.level,
					});
				}
			}

			visit(block.children);
		});
	};

	visit(blocks);

	return anchors;
};

export const extractPostTableOfContents = (blocks: Block[]): PostTableOfContentsItem[] =>
	extractPostHeadingAnchors(blocks).map(({ id, text, level }) => ({ id, text, level }));
