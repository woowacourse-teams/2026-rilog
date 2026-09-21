import type { Block } from '@blocknote/core';

interface InlineContent {
	type?: string;
	text?: string;
	content?: InlineContent[];
	styles?: Record<string, unknown>;
	href?: string;
	props?: { href?: string };
}

const getInlineMarkdown = (content: unknown): string => {
	if (!Array.isArray(content)) return '';

	return content
		.map((item) => {
			if (typeof item !== 'object' || item === null) return '';
			const node = item as InlineContent & { props?: { href?: string } };

			if (node.type === 'link') {
				const href = node.props?.href ?? node.href ?? '';
				const inner = getInlineMarkdown(node.content);
				return href ? `[${inner}](${href})` : inner;
			}

			if (node.type === 'text' && typeof node.text === 'string') {
				let text = node.text;
				const styles = node.styles as Record<string, boolean> | undefined;
				if (styles?.code) text = `\`${text}\``;
				else {
					if (styles?.bold) text = `**${text}**`;
					if (styles?.italic) text = `*${text}*`;
					if (styles?.strike) text = `~~${text}~~`;
				}
				return text;
			}

			if (Array.isArray(node.content)) {
				return getInlineMarkdown(node.content);
			}

			return '';
		})
		.join('');
};

const blockToMarkdown = (block: Block, depth = 0): string => {
	const inline = getInlineMarkdown((block as { content?: unknown }).content);
	const props = (block.props ?? {}) as Record<string, unknown>;
	const children = (block.children ?? []) as Block[];

	const childMarkdown = children.length > 0 ? `\n${children.map((c) => blockToMarkdown(c, depth + 1)).join('\n')}` : '';

	switch (block.type) {
		case 'heading': {
			const level = typeof props.level === 'number' ? Math.min(Math.max(props.level, 1), 6) : 1;
			return `${'#'.repeat(level)} ${inline}${childMarkdown}`;
		}
		case 'bulletListItem':
			return `- ${inline}${childMarkdown}`;
		case 'numberedListItem':
			return `1. ${inline}${childMarkdown}`;
		case 'checkListItem': {
			const checked = props.checked === true ? 'x' : ' ';
			return `- [${checked}] ${inline}${childMarkdown}`;
		}
		case 'codeBlock': {
			const language = typeof props.language === 'string' ? props.language : '';
			return `\`\`\`${language}\n${inline}\n\`\`\`${childMarkdown}`;
		}
		case 'quote':
			return `> ${inline}${childMarkdown}`;
		case 'divider':
			return `---${childMarkdown}`;
		case 'image': {
			const url = typeof props.url === 'string' ? props.url : '';
			const caption = typeof props.caption === 'string' ? props.caption : inline;
			return url ? `![${caption}](${url})${childMarkdown}` : childMarkdown.trim();
		}
		case 'video': {
			const url = typeof props.url === 'string' ? props.url : '';
			return url ? `[video](${url})${childMarkdown}` : childMarkdown.trim();
		}
		case 'file': {
			const url = typeof props.url === 'string' ? props.url : '';
			const name = typeof props.name === 'string' ? props.name : inline;
			return url ? `[${name}](${url})${childMarkdown}` : childMarkdown.trim();
		}
		case 'audio': {
			const url = typeof props.url === 'string' ? props.url : '';
			return url ? `[audio](${url})${childMarkdown}` : childMarkdown.trim();
		}
		case 'table':
			return `${inline}${childMarkdown}`;
		default:
			return `${inline}${childMarkdown}`;
	}
};

export const blocksToMarkdown = (blocks: Block[]): string => blocks.map((b) => blockToMarkdown(b)).join('\n\n');
