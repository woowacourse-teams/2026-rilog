export type ImageSizeSource = File | HTMLImageElement | { width: number; height: number };

export const appendImageSizeHash = async (source: ImageSizeSource, url: string): Promise<string> => {
	if (!url || url.includes('#')) return url;

	try {
		let width: number;
		let height: number;

		if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
			width = source.naturalWidth;
			height = source.naturalHeight;
		} else if (typeof File !== 'undefined' && source instanceof File) {
			if (!source.type.startsWith('image/') || typeof createImageBitmap !== 'function') {
				return url;
			}
			const bitmap = await createImageBitmap(source);
			width = bitmap.width;
			height = bitmap.height;
			bitmap.close();
		} else if ('width' in source && 'height' in source) {
			width = source.width;
			height = source.height;
		} else {
			return url;
		}

		if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) return url;
		const urlWithImageSizeHash = `${url}#${width}x${height}`;
		// 게시글 API의 thumbnailImageUrl 길이 제한을 넘기지 않는다.
		return urlWithImageSizeHash.length <= 512 ? urlWithImageSizeHash : url;
	} catch {
		// 이미지 크기를 읽지 못해도 업로드와 발행은 유지한다.
		return url;
	}
};
