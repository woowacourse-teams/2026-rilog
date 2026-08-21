export const getImageUrl = (keyOrUrl?: string | null): string => {
	if (!keyOrUrl) return '';
	if (keyOrUrl.startsWith('null/')) return '';

	// 이미 완성된 URL이거나 로컬 절대 경로, blob, data URL인 경우 그대로 반환
	if (/^(https?:\/\/|blob:|data:|\/)/.test(keyOrUrl)) {
		return keyOrUrl;
	}

	const bucketUrl = process.env.NEXT_PUBLIC_S3_BUCKET_URL ?? '';
	if (!bucketUrl) {
		return keyOrUrl;
	}

	const baseUrl = bucketUrl.replace(/\/$/, '');
	return `${baseUrl}/${keyOrUrl}`;
};
