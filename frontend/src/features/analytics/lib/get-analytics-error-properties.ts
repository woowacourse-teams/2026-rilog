import type { AnalyticsErrorProperties } from '../model/analytics-event';

import { normalizeApiError } from '@/shared/api/api-error';

export const getAnalyticsErrorProperties = (error: unknown): AnalyticsErrorProperties => {
	const normalized = normalizeApiError(error);

	if (normalized.type === 'api') {
		return { errorCode: normalized.detail.errorCode, errorKind: 'api' };
	}

	if (normalized.type === 'http') {
		return { errorCode: `HTTP_${normalized.response.status}`, errorKind: 'http' };
	}

	if (normalized.type === 'timeout' || normalized.type === 'network') {
		return { errorCode: normalized.type.toUpperCase(), errorKind: normalized.type };
	}

	return { errorCode: 'UNKNOWN_ERROR', errorKind: 'unknown' };
};
