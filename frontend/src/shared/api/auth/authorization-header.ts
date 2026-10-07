import { copyApiRequestDiagnostics } from '@/shared/api/request-diagnostics';
import { InvalidApiResponseError } from '@/shared/api/response-validation';

export const parseBearerToken = (header: string | null): string | null => {
	const token = header?.match(/^Bearer ([^\s,]+)$/i)?.[1];
	return token ?? null;
};

export const requireBearerToken = (response: Response, operation: string): string => {
	const token = parseBearerToken(response.headers.get('Authorization'));
	if (token === null) {
		const error = new InvalidApiResponseError(operation);
		copyApiRequestDiagnostics(response, error);
		throw error;
	}
	return token;
};
