import { expect, test } from '@playwright/test';

import type { Request } from '@playwright/test';

import { mockAuthenticatedAccess } from '@/test/e2e/fixtures/authenticated-access';

import { mockSentryTransportIfRequested } from './mock-sentry-transport';

const appOrigin = 'http://127.0.0.1:3109';
const requestId = 'sentry-smoke-post-503';
const postTitle = 'Sentry 발행 오류 테스트';
const postBody = '발행 요청 본문은 Sentry에 남지 않아야 합니다.';

test('게시글 발행 503 오류를 Sentry에 한 번 기록한다', async ({ page }) => {
	await mockSentryTransportIfRequested(page);
	await page.route('**/v1/**', (route) => route.abort('failed'));
	await mockAuthenticatedAccess(page, appOrigin);
	await page.route('**/v1/posts/count', (route) =>
		route.fulfill({ json: { status: 200, message: 'E2E fixture', data: { totalPostsCount: 0 } } }),
	);
	await page.route('**/v1/drafts/me?*', (route) =>
		route.fulfill({
			json: {
				status: 200,
				message: 'E2E fixture',
				data: { drafts: [], page: 0, size: 10, numberOfElements: 0, hasNext: false },
			},
		}),
	);
	await page.route('**/v1/users/me/cologs/overview', (route) =>
		route.fulfill({ json: { status: 200, message: 'E2E fixture', data: [] } }),
	);

	let publishRequestCount = 0;
	await page.route('**/v1/posts', (route) => {
		if (route.request().method() !== 'POST') return route.abort('failed');
		publishRequestCount += 1;
		return route.fulfill({
			status: 503,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': appOrigin,
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Expose-Headers': 'X-Request-ID',
				'X-Request-ID': requestId,
			},
			body: JSON.stringify({
				status: 503,
				error: 'Service Unavailable',
				errorCode: 'INTERNAL_SERVER_ERROR',
				message: 'Sentry smoke test',
				invalidParams: null,
			}),
		});
	});

	await page.goto('/write');
	await page.getByRole('textbox', { name: '게시글 제목' }).fill(postTitle);
	await page.getByRole('textbox', { name: '게시글 내용' }).click();
	await page.keyboard.type(postBody);
	await page.getByRole('button', { name: '발행', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: '게시 설정' });
	await expect(dialog).toBeVisible();

	const isPostPublishEvent = (request: Request) =>
		request.method() === 'POST' &&
		['/monitoring', '/envelope/'].some((path) => new URL(request.url()).pathname.endsWith(path)) &&
		Boolean(request.postData()?.includes(requestId));
	let sentryEventCount = 0;
	page.on('request', (request) => {
		if (isPostPublishEvent(request)) sentryEventCount += 1;
	});
	const sentryRequest = page.waitForRequest(isPostPublishEvent, { timeout: 30_000 });
	await dialog.getByRole('button', { name: '발행', exact: true }).click();
	await expect(dialog.getByRole('alert')).toBeVisible();

	const eventRequest = await sentryRequest;
	const envelope = eventRequest.postData();
	expect(publishRequestCount).toBe(1);
	expect(sentryEventCount).toBe(1);
	expect(envelope).toContain('"operation":"post.publish"');
	expect(envelope).toContain('"http_status":"503"');
	expect(envelope).toContain('"error_code":"INTERNAL_SERVER_ERROR"');
	expect(envelope).toContain('"request_id":"sentry-smoke-post-503"');
	expect(envelope).toContain('"user":{"id":"1"');
	expect(envelope).toContain('"api_request"');
	expect(envelope).toContain('"api_response"');
	expect(envelope).not.toContain(postTitle);
	expect(envelope).not.toContain(postBody);
	expect(envelope).not.toContain('e2e-access-token');
	expect((await eventRequest.response())?.ok()).toBe(true);

	const envelopeHeader = envelope?.split('\n', 1)[0];
	if (envelopeHeader) {
		const { event_id: eventId } = JSON.parse(envelopeHeader) as { event_id?: string };
		if (eventId) console.info(`Sentry event ID: ${eventId}`);
	}
});
