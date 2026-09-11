import { describe, expect, it } from 'vitest';

import { getBlogChapterCreateErrorMessage } from './get-blog-chapter-create-error-message';

const createApiError = (errorCode: string, message = '백엔드 오류 메시지') => ({
	type: 'api' as const,
	detail: {
		status: 400,
		error: 'BAD_REQUEST',
		errorCode,
		message,
		invalidParams: null,
	},
});

describe('getBlogChapterCreateErrorMessage', () => {
	it('같은 개수 제한 오류를 화면 맥락에 맞는 명칭으로 안내한다', () => {
		const error = createApiError('CHAPTER_COUNT_EXCEEDED', '챕터는 최대 30개까지 생성할 수 있습니다.');

		expect(getBlogChapterCreateErrorMessage(error, '챕터')).toBe('챕터는 최대 30개까지 추가할 수 있습니다.');
		expect(getBlogChapterCreateErrorMessage(error, '시리즈')).toBe('시리즈는 최대 30개까지 추가할 수 있습니다.');
	});

	it('알 수 없는 오류는 백엔드 문구 대신 화면 맥락별 기본 문구를 사용한다', () => {
		const error = createApiError('UNKNOWN_ERROR');

		expect(getBlogChapterCreateErrorMessage(error, '챕터')).toBe('챕터를 추가하지 못했어요. 다시 시도해 주세요.');
		expect(getBlogChapterCreateErrorMessage(error, '시리즈')).toBe('시리즈를 추가하지 못했어요. 다시 시도해 주세요.');
	});
});
