import type { Block } from '@blocknote/core';

const EXCLUDED_BLOCK_TYPES = new Set(['audio', 'codeBlock', 'file', 'image', 'video']);

const getInlineText = (content: unknown): string => {
	if (!Array.isArray(content)) return '';
	return content
		.map((item) => {
			if (typeof item !== 'object' || item === null) return '';
			const value = item as { content?: unknown; text?: unknown; type?: unknown };
			return value.type === 'text' && typeof value.text === 'string' ? value.text : getInlineText(value.content);
		})
		.join('');
};

export const extractPostDescription = (blocks: Block[], maxLength = 160): string => {
	const text = blocks
		.flatMap((block) => (EXCLUDED_BLOCK_TYPES.has(block.type) ? [] : [getInlineText(block.content)]))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (text.length <= maxLength) return text;
	const truncated = text.slice(0, maxLength + 1);
	const lastSpace = truncated.lastIndexOf(' ');
	return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}…`;
};
