import ky from 'ky';

import { normalizeApiError } from '@/shared/api/api-error';
import type { InvalidParam } from '@/shared/api/shared.types';

export async function createApiFailure(errorCode: string, status = 400, invalidParams: InvalidParam[] | null = null) {
	const original: unknown = await ky
		.get('https://api.rilog.test/failure', {
			retry: 0,
			fetch: () =>
				Promise.resolve(
					new Response(
						JSON.stringify({ status, error: 'error', errorCode, message: 'private test data', invalidParams }),
						{
							status,
							headers: { 'Content-Type': 'application/json' },
						},
					),
				),
		})
		.catch((error: unknown) => error);
	return normalizeApiError(original);
}
