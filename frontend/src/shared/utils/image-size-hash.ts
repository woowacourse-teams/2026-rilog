const IMAGE_SIZE_HASH = /#([1-9]\d*)x([1-9]\d*)$/;

interface ParsedImageSizeHash {
	url: string;
	width: number;
	height: number;
}

export const parseImageSizeHash = (url: string): ParsedImageSizeHash | null => {
	const match = IMAGE_SIZE_HASH.exec(url);
	if (match === null) return null;

	const width = Number(match[1]);
	const height = Number(match[2]);
	if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) return null;

	return { url: url.slice(0, match.index), width, height };
};
