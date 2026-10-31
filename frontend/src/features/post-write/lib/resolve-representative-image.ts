import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import type { PostContentBlock } from '@/domains/post/model/post-content';
import type { ImageSource } from '@/features/analytics/model/analytics-event';
import type { PublicationSettings } from '@/features/post-write/model/post-publication';
const getImageUrl = (block: PostContentBlock): string | null => {
	if (block.type !== 'image') {
		return null;
	}

	const url = block.props.url;
	return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
};

export const findFirstBodyImageUrl = (blocks: PostContentBlock[]): string | null => {
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
	blocks: PostContentBlock[],
	defaultImageUrl: string,
) => selectedImageUrl ?? findFirstBodyImageUrl(blocks) ?? defaultImageUrl;

export const resolveRepresentativeImageSource = (
	settings: PublicationSettings,
	blocks: PostContentBlock[],
): ImageSource => {
	if (settings.representativeImage !== null) return 'uploaded';
	if (settings.representativeImageUrl === POST_THUMBNAIL_FALLBACK_URL) return 'default';
	if (settings.representativeImageUrl !== null) return 'existing';
	return findFirstBodyImageUrl(blocks) === null ? 'default' : 'body';
};
