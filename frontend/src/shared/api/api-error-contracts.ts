import type { ApiErrorCode } from './error-codes';

export type ApiOperation =
	| 'draft.save'
	| 'draft.overwrite'
	| 'draft.publish'
	| 'post.publish'
	| 'post.update'
	| 'colog.create'
	| 'colog.invite'
	| 'oauth.callback'
	| 'upload.presign'
	| 'upload.put'
	| 'query'
	| 'mutation'
	| 'content.load'
	| 'unhandled';

export type ExpectedApiErrorRule = 'exclude' | 'user-input' | 'oauth-cancelled';

interface ApiOperationContract {
	feature: 'writing' | 'colog' | 'auth' | 'upload' | 'content' | 'api';
	expectedErrors: Partial<Record<ApiErrorCode, ExpectedApiErrorRule>>;
}

/** 공통 인증 복구 계약. 누락된 인증 헤더/claim 등 앱 계약 오류는 여기에 포함하지 않는다. */
export const EXPECTED_AUTH_ERROR_CODES: readonly ApiErrorCode[] = [
	'EXPIRED_ACCESS_TOKEN',
	'INVALID_ACCESS_TOKEN',
	'EXPIRED_ONBOARDING_TOKEN',
	'INVALID_ONBOARDING_TOKEN',
	'REFRESH_TOKEN_MISSING',
	'EXPIRED_REFRESH_TOKEN',
	'INVALID_REFRESH_TOKEN',
];

const userValidation = { REQUEST_VALIDATION_FAILED: 'user-input' } as const;
const genericExpectedErrors = {
	...userValidation,
	USER_COLOG_COUNT_EXCEEDED: 'exclude',
	COLOG_MEMBER_COUNT_EXCEEDED: 'exclude',
	CHAPTER_COUNT_EXCEEDED: 'exclude',
	COMMENT_REPLY_DEPTH_EXCEEDED: 'exclude',
} as const;

/**
 * 정상 제외 후보이며 5xx/미정의 코드보다 우선하지 않는다.
 * 엔드포인트와 BE 근거, 공통 권한/부재/중복 규칙은 docs/observability/api-error-operation-contracts.md 참조.
 * 계약 변경 시 오류 코드표·이 목록·수집 정책 테스트를 함께 갱신한다.
 */
export const API_ERROR_OPERATION_CONTRACTS: Record<ApiOperation, ApiOperationContract> = {
	'draft.save': {
		feature: 'writing',
		expectedErrors: { ...userValidation, USER_NOT_FOUND: 'exclude', RILOG_NOT_FOUND: 'exclude' },
	},
	'draft.overwrite': {
		feature: 'writing',
		expectedErrors: { ...userValidation, DRAFT_NOT_FOUND: 'exclude', NOT_POST_AUTHOR: 'exclude' },
	},
	'draft.publish': {
		feature: 'writing',
		expectedErrors: {
			...userValidation,
			DRAFT_NOT_FOUND: 'exclude',
			NOT_POST_AUTHOR: 'exclude',
			USER_NOT_FOUND: 'exclude',
			BLOG_MEMBER_DOESNT_NOT_BELONG: 'exclude',
			ALREADY_BLOG_MEMBER_LEFT: 'exclude',
			CHAPTER_NOT_FOUND: 'exclude',
			DUPLICATED_PUBLISH: 'exclude',
			RILOG_POST_PUBLISH_FORBIDDEN: 'exclude',
		},
	},
	'post.publish': {
		feature: 'writing',
		expectedErrors: {
			...userValidation,
			BLOG_NOT_FOUND: 'exclude',
			USER_NOT_FOUND: 'exclude',
			RILOG_NOT_FOUND: 'exclude',
			CHAPTER_NOT_FOUND: 'exclude',
			RILOG_POST_PUBLISH_FORBIDDEN: 'exclude',
			COLOG_POST_PUBLISH_FORBIDDEN: 'exclude',
		},
	},
	'post.update': {
		feature: 'writing',
		expectedErrors: {
			...userValidation,
			POST_NOT_FOUND: 'exclude',
			NOT_POST_AUTHOR: 'exclude',
			CHAPTER_NOT_FOUND: 'exclude',
			BLOG_MEMBER_DOESNT_NOT_BELONG: 'exclude',
			ALREADY_BLOG_MEMBER_LEFT: 'exclude',
		},
	},
	'colog.create': {
		feature: 'colog',
		expectedErrors: {
			...userValidation,
			INVALID_SLUG: 'user-input',
			USER_NOT_FOUND: 'exclude',
			BLOG_SLUG_ALREADY_EXISTS: 'exclude',
			BLOG_PROFILE_NAME_ALREADY_EXISTS: 'exclude',
			USER_COLOG_COUNT_EXCEEDED: 'exclude',
		},
	},
	'colog.invite': {
		feature: 'colog',
		expectedErrors: {
			...userValidation,
			BLOG_NOT_FOUND: 'exclude',
			USER_NOT_FOUND: 'exclude',
			BLOG_MEMBER_INVITE_FORBIDDEN: 'exclude',
			ADMIN_PERMISSION_REQUIRED: 'exclude',
			BLOG_MEMBER_ALREADY_EXISTS: 'exclude',
			COLOG_MEMBER_COUNT_EXCEEDED: 'exclude',
			USER_COLOG_COUNT_EXCEEDED: 'exclude',
		},
	},
	'oauth.callback': {
		feature: 'auth',
		expectedErrors: { INVALID_OAUTH_STATE: 'exclude', OAUTH_REQUEST_FAILED: 'oauth-cancelled' },
	},
	'upload.presign': {
		feature: 'upload',
		expectedErrors: {
			...userValidation,
			UNSUPPORTED_IMAGE_FORMAT: 'exclude',
			IMAGE_SIZE_EXCEEDED: 'exclude',
			UNSUPPORTED_FILE_FORMAT: 'exclude',
			FILE_SIZE_EXCEEDED: 'exclude',
		},
	},
	// S3 PUT은 자사 API 권한/부재 코드로 제외하지 않는다.
	'upload.put': { feature: 'upload', expectedErrors: {} },
	query: { feature: 'api', expectedErrors: genericExpectedErrors },
	mutation: { feature: 'api', expectedErrors: genericExpectedErrors },
	'content.load': { feature: 'content', expectedErrors: genericExpectedErrors },
	unhandled: { feature: 'api', expectedErrors: genericExpectedErrors },
};

/** 임의 문자열 대신 고정 operation만 전송한다. 자동 수집/직접 capture는 unhandled로 분류한다. */
export function resolveApiOperation(value: unknown): ApiOperation {
	return typeof value === 'string' && Object.hasOwn(API_ERROR_OPERATION_CONTRACTS, value)
		? (value as ApiOperation)
		: 'unhandled';
}
