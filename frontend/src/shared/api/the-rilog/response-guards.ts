import type { TheRilogNewsResponse, TheRilogResponse, TheRilogSpotlightResponse } from './types';

import { isRecord } from '@/shared/api/response-validation';

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const isId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const isNews = (value: unknown): value is TheRilogNewsResponse =>
	isRecord(value) &&
	isId(value.postId) &&
	isText(value.slug) &&
	isText(value.title) &&
	isText(value.publishedAt) &&
	Array.isArray(value.headlines) &&
	value.headlines.every((headline: unknown) => isRecord(headline) && isText(headline.title));

const isSpotlight = (value: unknown): value is TheRilogSpotlightResponse =>
	isRecord(value) &&
	isId(value.postId) &&
	isText(value.slug) &&
	(value.articleType === 'enterprise' || value.articleType === 'personal') &&
	isText(value.title) &&
	typeof value.description === 'string' &&
	isNullableString(value.thumbnailImageUrl) &&
	isText(value.publishedAt) &&
	(value.source === null ||
		(isRecord(value.source) &&
			isText(value.source.sourceProfileName) &&
			isNullableString(value.source.sourceProfileImage)));

export const isTheRilogResponse = (value: unknown): value is TheRilogResponse => {
	if (
		!isRecord(value) ||
		!isText(value.blogSlug) ||
		!isNullableString(value.date) ||
		(value.news !== null && !isNews(value.news)) ||
		!Array.isArray(value.spotlights) ||
		!value.spotlights.every(isSpotlight)
	)
		return false;

	return true;
};
