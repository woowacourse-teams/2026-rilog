import type { Block } from '@blocknote/core';

import type { ImageSource } from '@/features/analytics/model/analytics-event';
import type { PublicationSettings } from '@/features/post-write/model/post-publication';
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

export const resolveRepresentativeImageSource = (settings: PublicationSettings, blocks: Block[]): ImageSource => {
	if (settings.representativeImage !== null) return 'uploaded';
	if (settings.representativeImageUrl !== null) return 'existing';
	return findFirstBodyImageUrl(blocks) === null ? 'default' : 'body';
};
