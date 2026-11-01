export const SIZES = {
	images: [750, 1200, 1400, 2000],
	profiles: [50, 360],
} as const;

export type ImageKind = keyof typeof SIZES;

const RAW_PATH = /^(.*)\/(images|profiles)\/raw\/([^/]+)\/original\.(png|jpe?g|webp|gif)$/i;

const parseRaw = (src: string) => {
	try {
		const url = new URL(src);
		const match = RAW_PATH.exec(url.pathname);
		return match ? { url, kind: match[2] as ImageKind } : null;
	} catch {
		return null;
	}
};

export const getImageKind = (src: string): ImageKind | null => parseRaw(src)?.kind ?? null;

export const toCompactUrl = (src: string, size: number): string => {
	const parsed = parseRaw(src);
	if (!parsed) {
		return src;
	}
	parsed.url.pathname = parsed.url.pathname.replace(RAW_PATH, `$1/$2/compact/$3/${size}.webp`);
	return parsed.url.toString();
};

export const toSrcSet = (src: string): string | undefined => {
	const parsed = parseRaw(src);
	if (!parsed) {
		return undefined;
	}
	return SIZES[parsed.kind].map((s) => `${toCompactUrl(src, s)} ${s}w`).join(', ');
};
