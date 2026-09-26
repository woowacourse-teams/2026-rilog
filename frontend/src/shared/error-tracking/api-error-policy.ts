import type { NormalizedApiError } from '@/shared/api/api-error';
import type { ApiOperation } from '@/shared/api/api-error-contracts';
import { API_ERROR_OPERATION_CONTRACTS, EXPECTED_AUTH_ERROR_CODES } from '@/shared/api/api-error-contracts';
import { isApiErrorCode } from '@/shared/api/error-codes';

export interface ApiErrorContext {
	operation: ApiOperation;
	/** OAuth query 원문 대신 확인된 취소 여부만 전달한다. */
	oauthCancelled?: boolean;
	/** 실제 요청값이 알려진 입력 제약을 위반한 사용자 필드명만 전달한다. */
	invalidUserInputFields?: readonly string[];
}

const LEGACY_CODES = new Set([
	'DATA_NOT_DUPLICATED_KEY',
	'REUSED_REFRESH_TOKEN',
	'BLOG_MEMBER_PERMISSION_INVALID',
	'RENAME_PLZ',
]);
function isUserValidation(error: Extract<NormalizedApiError, { type: 'api' }>, context: ApiErrorContext): boolean {
	const { operation, invalidUserInputFields = [] } = context;
	const code = error.detail.errorCode;
	if (operation === 'colog.create' && code === 'INVALID_SLUG') return invalidUserInputFields.includes('slug');
	if (code !== 'REQUEST_VALIDATION_FAILED' || !error.detail.invalidParams?.length) return false;
	return error.detail.invalidParams.every(
		(param) => typeof param?.name === 'string' && invalidUserInputFields.includes(param.name),
	);
}

/** 정상 사용자 거부보다 계약 밖 코드/5xx를 우선한다. 혼합·알 수 없는 검증은 정상으로 단정하지 않는다. */
export function shouldReportApiError(error: NormalizedApiError, context: ApiErrorContext, online = true): boolean {
	const cause = error.cause;
	if (cause instanceof Error && cause.name === 'AbortError') return false;
	if (
		!online &&
		(error.type === 'network' || error.type === 'timeout' || (cause instanceof Error && cause.name === 'NetworkError'))
	)
		return false;
	if ('response' in error && (error.response.status >= 500 || error.response.status === 429)) return true;
	// S3의 403/404는 자사 API의 정상 권한/부재 계약으로 판단하지 않는다.
	if (context.operation === 'upload.put') return true;
	if (error.type === 'api') {
		const code = error.detail.errorCode;
		if (!isApiErrorCode(code) || LEGACY_CODES.has(code)) return true;
		if (['authorization', 'not-found', 'conflict'].includes(error.kind ?? '')) return false;
		if (EXPECTED_AUTH_ERROR_CODES.includes(code)) return false;
		const rule = API_ERROR_OPERATION_CONTRACTS[context.operation].expectedErrors[code];
		if (rule === 'exclude') return false;
		if (rule === 'oauth-cancelled' && context.oauthCancelled) return false;
		if (rule === 'user-input' && isUserValidation(error, context)) return false;
		// 일반 query/mutation의 추가 400 수집은 핵심 플로우/복구 UI에 위임한다.
		return context.operation !== 'query' && context.operation !== 'mutation';
	}
	if (error.type === 'http' && [401, 403, 404, 409].includes(error.response.status)) return false;
	return error.type !== 'http' || (context.operation !== 'query' && context.operation !== 'mutation');
}
