import { POST_TITLE_MAX_LENGTH } from '@/domains/post/model/post';

/** 값 누락/타입 오류는 앱 계약 문제다. 실제 문자열 입력의 제약 위반만 반환한다. */
export function getInvalidPostInputFields(title: unknown): string[] {
	return typeof title === 'string' && (title.trim().length === 0 || title.length > POST_TITLE_MAX_LENGTH)
		? ['title']
		: [];
}
