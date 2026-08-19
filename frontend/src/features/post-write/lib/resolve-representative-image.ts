import type { Block } from '@blocknote/core';

const getImageUrl = (block: Block): string | null => {
	if (block.type !== 'image') {
		return null;
	}

	const url = block.props.url;
	return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
};

export const findFirstBodyImageUrl = (blocks: Block[]): string | null => {
	for (const block of blocks) {
		const blockImageUrl = getImageUrl(block);
		if (blockImageUrl !== null) {
			return blockImageUrl;
		}

		const childImageUrl = findFirstBodyImageUrl(block.children);
		if (childImageUrl !== null) {
			return childImageUrl;
		}
	}

	return null;
};

export const resolveRepresentativeImagePreview = (
	selectedImageUrl: string | null,
	blocks: Block[],
	defaultImageUrl: string,
) => selectedImageUrl ?? findFirstBodyImageUrl(blocks) ?? defaultImageUrl;
