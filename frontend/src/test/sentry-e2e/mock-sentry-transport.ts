import type { Page } from '@playwright/test';

/** Local smoke runs can inspect the real SDK envelope without sending it to Sentry. */
export async function mockSentryTransportIfRequested(page: Page): Promise<void> {
	if (process.env.SENTRY_SMOKE_DRY_RUN !== 'true') return;

	await page.route(
		(url) => url.pathname === '/monitoring' || /\/envelope\/?$/.test(url.pathname),
		(route) =>
			route.fulfill({
				status: 200,
				headers: { 'Access-Control-Allow-Origin': '*' },
				body: '{}',
			}),
	);
}
