import { InvalidApiResponseError } from '@/shared/api/response-validation';

export const parseBearerToken = (header: string | null): string | null => {
	const token = header?.match(/^Bearer ([^\s,]+)$/i)?.[1];
	return token ?? null;
};

export const requireBearerToken = (header: string | null, operation: string): string => {
	const token = parseBearerToken(header);
	if (token === null) throw new InvalidApiResponseError(operation);
	return token;
};
