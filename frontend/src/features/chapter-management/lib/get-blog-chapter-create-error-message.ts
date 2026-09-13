import { MAX_BLOG_CHAPTER_COUNT } from '@/domains/chapter/model/chapter';
import { isErrorDetail } from '@/shared/api/api-error';

type BlogChapterDisplayName = '챕터' | '시리즈';

const getApiErrorCode = (error: unknown) => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'type' in error &&
		error.type === 'api' &&
		'detail' in error &&
		isErrorDetail(error.detail)
	) {
		return error.detail.errorCode;
	}

	return undefined;
};

export const getBlogChapterCreateErrorMessage = (error: unknown, displayName: BlogChapterDisplayName) => {
	switch (getApiErrorCode(error)) {
		case 'CHAPTER_COUNT_EXCEEDED':
			return `${displayName}는 최대 ${MAX_BLOG_CHAPTER_COUNT}개까지 추가할 수 있습니다.`;
		case 'CHAPTER_NAME_ALREADY_EXISTS':
			return `같은 이름의 ${displayName}가 이미 있습니다.`;
		case 'INVALID_CHAPTER_NAME':
			return `${displayName} 이름을 확인해 주세요.`;
		case 'CHAPTER_MANAGE_FORBIDDEN':
			return `${displayName}를 추가할 권한이 없습니다.`;
		default:
			return `${displayName}를 추가하지 못했어요. 다시 시도해 주세요.`;
	}
};
