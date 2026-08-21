import { getImageUrl } from '@/shared/utils/get-image-url';

export const POST_THUMBNAIL_FALLBACK_URL = '/images/thumbnail-fallback.svg';

export const resolvePostThumbnailUrl = (thumbnailUrl: string | null): string =>
	getImageUrl(thumbnailUrl) || POST_THUMBNAIL_FALLBACK_URL;
