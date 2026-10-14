import { gunzipSync } from 'node:zlib';

import { expect, test } from '@playwright/test';

interface AnalyticsEvent {
	event: string;
	properties: Record<string, unknown>;
}

// Real Next Link/router and SDK transport are needed to prove that native clicks,
// encoded heading navigation and SPA arrival keep the same attribution. All
// analytics requests terminate locally, so test events never reach PostHog.
test('실제 SDK 전송에서 헤드라인 클릭과 상세 도착·읽기를 연결하고 재방문을 새로 센다', async ({ page, context }) => {
	const events: AnalyticsEvent[] = [];
	await context.route('https://posthog.rilog.test/**', async (route) => {
		if (new URL(route.request().url()).pathname.endsWith('.js')) {
			await route.fulfill({ contentType: 'application/javascript', body: '' });
			return;
		}
		const request = route.request();
		const body = request.postDataBuffer();
		if (body !== null && new URL(request.url()).pathname === '/e/') {
			let data: unknown;
			if (body[0] === 0x1f && body[1] === 0x8b) {
				data = JSON.parse(gunzipSync(body).toString());
			} else {
				const text = body.toString();
				const encoded = new URLSearchParams(text).get('data');
				data = JSON.parse(encoded === null ? text : Buffer.from(encoded, 'base64').toString());
			}
			const batch: unknown[] = Array.isArray(data)
				? data
				: typeof data === 'object' && data !== null && 'batch' in data && Array.isArray(data.batch)
					? data.batch
					: [data];
			for (const item of batch) {
				if (
					typeof item === 'object' &&
					item !== null &&
					'event' in item &&
					typeof item.event === 'string' &&
					'properties' in item &&
					typeof item.properties === 'object' &&
					item.properties !== null
				) {
					events.push({ event: item.event, properties: item.properties as Record<string, unknown> });
				}
			}
		}
		await route.fulfill({
			contentType: 'application/json',
			json: { status: 1, featureFlags: {}, featureFlagPayloads: {}, sessionRecording: false },
		});
	});
	await context.route('https://api.rilog.test/**', async (route) => {
		const pathname = new URL(route.request().url()).pathname;
		if (pathname.endsWith('/comment-anchors/sidebar')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { anchorGroups: [] } } });
		} else if (pathname.endsWith('/comment-anchors')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { blocks: [] } } });
		} else if (pathname.endsWith('/history')) {
			await route.fulfill({ status: 204 });
		} else {
			await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
		}
	});
	await page.goto('/the-rilog');
	await expect.poll(() => events.filter(({ event }) => event === 'the rilog viewed').length).toBe(1);
	const firstVisit = events.find(({ event }) => event === 'the rilog viewed')?.properties.the_rilog_visit_id;
	const headline = page.getByRole('link', { name: '웹 플랫폼 업데이트', exact: true });
	await headline.hover();
	expect(events.filter(({ event }) => event === 'the rilog headline clicked')).toHaveLength(0);
	await headline.focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/@the_rilog\/posts\/100#/);
	await expect(page.locator('[id="웹-플랫폼-업데이트"]')).toBeInViewport();
	await expect.poll(() => events.filter(({ event }) => event === 'post detail viewed').length).toBe(1);
	const clicked = events.find(({ event }) => event === 'the rilog headline clicked')?.properties;
	expect(clicked).toMatchObject({
		the_rilog_visit_id: firstVisit,
		post_id: 100,
		content_type: 'headline',
		position: 2,
		navigation_type: 'same_tab',
	});
	const arrival = events.find(({ event }) => event === 'post detail viewed')?.properties;
	expect(arrival).toMatchObject({
		entry_source: 'the_rilog',
		the_rilog_visit_id: firstVisit,
		the_rilog_click_id: clicked?.the_rilog_click_id,
	});
	await expect
		.poll(
			() =>
				events.some(
					({ event, properties }) =>
						event === 'post reading progress' && properties.the_rilog_click_id === clicked?.the_rilog_click_id,
				),
			{ timeout: 20_000 },
		)
		.toBe(true);
	await page.goBack();
	await expect(page).toHaveURL(/\/the-rilog$/);
	await expect.poll(() => events.filter(({ event }) => event === 'the rilog viewed').length).toBe(2);
	const views = events.filter(({ event }) => event === 'the rilog viewed');
	expect(views[1].properties.the_rilog_visit_id).not.toBe(firstVisit);

	const popupPromise = context.waitForEvent('page');
	await page.getByRole('link', { name: '기업 기사', exact: true }).click({ button: 'middle' });
	const popup = await popupPromise;
	await expect(popup).toHaveURL(/\/@the_rilog\/posts\/101$/);
	await expect
		.poll(() =>
			events.some(
				({ event, properties }) => event === 'the rilog enterprise clicked' && properties.navigation_type === 'new_tab',
			),
		)
		.toBe(true);
	expect(await page.evaluate(() => sessionStorage.getItem('rilog.post-detail-entry-context'))).toBeNull();
	await expect
		.poll(() => events.some(({ event, properties }) => event === 'post detail viewed' && properties.post_id === 101))
		.toBe(true);
	expect(
		events.find(({ event, properties }) => event === 'post detail viewed' && properties.post_id === 101)?.properties,
	).toMatchObject({ entry_source: 'direct' });
	expect(
		events.find(({ event, properties }) => event === 'post detail viewed' && properties.post_id === 101)?.properties,
	).not.toHaveProperty('the_rilog_click_id');
	await popup.close();

	const modifiedPagePromise = context.waitForEvent('page');
	await page.getByRole('link', { name: '개인 기사', exact: true }).click({ modifiers: ['ControlOrMeta'] });
	const modifiedPage = await modifiedPagePromise;
	await expect(modifiedPage).toHaveURL(/\/@the_rilog\/posts\/102$/);
	await expect
		.poll(() =>
			events.some(
				({ event, properties }) => event === 'the rilog personal clicked' && properties.navigation_type === 'new_tab',
			),
		)
		.toBe(true);
	expect(await page.evaluate(() => sessionStorage.getItem('rilog.post-detail-entry-context'))).toBeNull();
	await modifiedPage.close();
});
