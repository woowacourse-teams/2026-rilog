import type { CologCreateRequest } from './types';

import { BLOG_PROFILE_URL_MAX_LENGTH } from '@/domains/blog/model/blog';
import {
	COLOG_NAME_MAX_LENGTH,
	COLOG_DESCRIPTION_MAX_LENGTH,
	COLOG_SLUG_MIN_LENGTH,
	COLOG_SLUG_MAX_LENGTH,
	COLOG_SLUG_PATTERN,
} from '@/domains/blog/model/colog';

/** 서버 문구를 해석하지 않고, 실제 요청의 사용자 입력이 계약을 위반했는지 확인한다. */
export function getInvalidCologInputFields(request: CologCreateRequest): string[] {
	const invalid: string[] = [];
	if (typeof request.name === 'string' && (!request.name.trim() || request.name.length > COLOG_NAME_MAX_LENGTH))
		invalid.push('name');
	if (
		typeof request.slug === 'string' &&
		(request.slug.length < COLOG_SLUG_MIN_LENGTH ||
			request.slug.length > COLOG_SLUG_MAX_LENGTH ||
			!COLOG_SLUG_PATTERN.test(request.slug.toLowerCase()))
	)
		invalid.push('slug');
	if (typeof request.introduction === 'string' && request.introduction.length > COLOG_DESCRIPTION_MAX_LENGTH)
		invalid.push('introduction');
	for (const field of ['serviceUrl', 'githubUrl'] as const) {
		if (typeof request[field] === 'string' && request[field].length > BLOG_PROFILE_URL_MAX_LENGTH) invalid.push(field);
	}
	return invalid;
}
