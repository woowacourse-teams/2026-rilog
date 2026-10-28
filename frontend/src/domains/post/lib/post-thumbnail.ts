import { getImageUrl } from '@/shared/utils/get-image-url';
import { parseImageSizeHash } from '@/shared/utils/image-size-hash';

export const POST_THUMBNAIL_FALLBACK_URL = '/images/thumbnail-fallback.svg';

export const resolvePostThumbnailUrl = (thumbnailUrl: string | null): string =>
	getImageUrl(parseImageSizeHash(thumbnailUrl ?? '')?.url ?? thumbnailUrl) || POST_THUMBNAIL_FALLBACK_URL;
