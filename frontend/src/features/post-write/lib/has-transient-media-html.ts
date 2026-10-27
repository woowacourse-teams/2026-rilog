import type { UploadBlockType } from './insert-upload-block';

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

export const getTransientMediaHtmlType = (html: string): UploadBlockType | null => {
	if (html.length === 0) return null;

	const document = new DOMParser().parseFromString(html, 'text/html');
	const element = Array.from(document.querySelectorAll(MEDIA_URL_SELECTOR)).find((candidate) =>
		['data-url', 'src'].some((attribute) => isTransientMediaUrl(candidate.getAttribute(attribute) ?? '')),
	);
	if (element === undefined) return null;

	const contentType = element.getAttribute('data-content-type');
	if (contentType === 'image' || element.tagName === 'IMG') return 'image';
	if (contentType === 'video' || element.tagName === 'VIDEO' || element.closest('video') !== null) return 'video';
	if (contentType === 'audio' || element.tagName === 'AUDIO' || element.closest('audio') !== null) return 'audio';
	return 'file';
};

export const hasTransientMediaHtml = (html: string): boolean => getTransientMediaHtmlType(html) !== null;
