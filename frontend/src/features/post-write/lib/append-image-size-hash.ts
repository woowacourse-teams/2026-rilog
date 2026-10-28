import { getImageUrl } from '@/shared/utils/get-image-url';

export const appendImageSizeHash = async (file: File, url: string): Promise<string> => {
	const publicUrl = getImageUrl(url);
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(publicUrl);
	} catch {
		return url;
	}
	// 백엔드의 S3ObjectKeyResolver는 S3 HTTPS URL의 path만 객체 키로 사용한다.
	if (
		!file.type.startsWith('image/') ||
		url.includes('#') ||
		typeof createImageBitmap !== 'function' ||
		parsedUrl.protocol !== 'https:' ||
		!/^.+\.s3\.[^.]+\.amazonaws\.com$/.test(parsedUrl.hostname)
	) {
		return url;
	}

	try {
		const bitmap = await createImageBitmap(file);
		const { width, height } = bitmap;
		bitmap.close();
		if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) return url;
		const urlWithImageSizeHash = `${publicUrl}#${width}x${height}`;
		// 게시글 API의 thumbnailImageUrl 길이 제한을 넘기지 않는다.
		return urlWithImageSizeHash.length <= 512 ? urlWithImageSizeHash : url;
	} catch {
		// 이미지 크기를 읽지 못해도 업로드와 발행은 유지한다.
		return url;
	}
};
