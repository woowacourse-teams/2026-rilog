import { expect, test } from '@playwright/test';

import { mockSentryTransportIfRequested } from './mock-sentry-transport';

const requestId = 'sentry-smoke-feed-503';
const apiError = {
	status: 503,
	error: 'Service Unavailable',
	errorCode: 'INTERNAL_SERVER_ERROR',
	message: 'Sentry smoke test',
	invalidParams: null,
};

test('피드 API 503 오류를 Sentry에 기록한다', async ({ page }) => {
	await mockSentryTransportIfRequested(page);
	await page.goto('/feeds');
	const updateNotice = page.getByRole('button', { name: '이 업데이트 다시 보지 않기' });
	if (await updateNotice.isVisible()) await updateNotice.click();

	const appOrigin = new URL(page.url()).origin;
	await page.route('**/v1/feeds/posts?*', (route) =>
		route.fulfill({
			status: 503,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': appOrigin,
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Expose-Headers': 'X-Request-ID',
				'X-Request-ID': requestId,
			},
			body: JSON.stringify(apiError),
		}),
	);

	const sentryRequest = page.waitForRequest(
		(request) =>
			request.method() === 'POST' &&
			['/monitoring', '/envelope/'].some((path) => new URL(request.url()).pathname.endsWith(path)) &&
			Boolean(request.postData()?.includes(requestId)),
		{ timeout: 30_000 },
	);
	await page.locator('select').selectOption('latest');
	await expect(page.getByText('피드를 불러오지 못했어요.')).toBeVisible();

	const eventRequest = await sentryRequest;
	const envelope = eventRequest.postData();
	expect(envelope).toContain('INTERNAL_SERVER_ERROR');
	expect(envelope).toContain('"operation":"query"');
	expect(envelope).toContain('"http_status":"503"');
	expect(envelope).toContain('"request_id":"sentry-smoke-feed-503"');
	expect(envelope).toContain('"api_request"');
	expect(envelope).toContain('"api_response"');
	expect((await eventRequest.response())?.ok()).toBe(true);

	const envelopeHeader = envelope?.split('\n', 1)[0];
	if (envelopeHeader) {
		const { event_id: eventId } = JSON.parse(envelopeHeader) as { event_id?: string };
		if (eventId) console.info(`Sentry event ID: ${eventId}`);
	}
});
