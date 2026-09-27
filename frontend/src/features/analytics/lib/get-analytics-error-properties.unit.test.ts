import ky from 'ky';
import { expect, it } from 'vitest';

import { normalizeApiError } from '@/shared/api/api-error';

import { getAnalyticsErrorProperties } from './get-analytics-error-properties';

it('API 요청에서 정규화한 오류를 분석할 때 실제 오류코드를 유지한다', async () => {
	const error = await ky
		.get('https://api.rilog.test/callback', {
			retry: 0,
			fetch: () =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							status: 502,
							error: 'BAD_GATEWAY',
							errorCode: 'GITHUB_USER_FETCH_FAILED',
							message: 'failed',
							invalidParams: null,
						}),
						{ status: 502, headers: { 'Content-Type': 'application/json' } },
					),
				),
		})
		.catch(normalizeApiError);
	expect(getAnalyticsErrorProperties(error)).toEqual({ errorCode: 'GITHUB_USER_FETCH_FAILED', errorKind: 'api' });
});
