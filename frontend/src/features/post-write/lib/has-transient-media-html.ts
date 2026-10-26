import { isTransientMediaUrl } from './validate-post-media';

const MEDIA_URL_SELECTOR = [
	'img[src]',
	'video[src]',
	'audio[src]',
	'video source[src]',
	'audio source[src]',
	'embed[src]',
	'[data-content-type="image"][data-url]',
	'[data-content-type="file"][data-url]',
	'[data-content-type="video"][data-url]',
	'[data-content-type="audio"][data-url]',
].join(',');

export const hasTransientMediaHtml = (html: string): boolean => {
	if (html.length === 0) return false;

	const document = new DOMParser().parseFromString(html, 'text/html');
	return Array.from(document.querySelectorAll(MEDIA_URL_SELECTOR)).some((element) =>
		['data-url', 'src'].some((attribute) => isTransientMediaUrl(element.getAttribute(attribute) ?? '')),
	);
};
