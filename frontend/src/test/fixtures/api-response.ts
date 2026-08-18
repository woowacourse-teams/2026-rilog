import { API_ERROR_CODES } from '@/shared/api/error-codes';

export const createUnauthorizedResponse = (
	errorCode: string = API_ERROR_CODES.EXPIRED_ACCESS_TOKEN,
	message: string = 'Access Token이 만료되었습니다.',
) => {
	return new Response(
		JSON.stringify({
			status: 401,
			error: 'UNAUTHORIZED',
			errorCode,
			message,
			invalidParams: null,
		}),
		{ headers: { 'Content-Type': 'application/json' }, status: 401 },
	);
};

export const createEmptyResponse = (status: number = 200) => {
	return new Response(null, { status });
};
