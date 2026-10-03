import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { renderReadingContent } from './fixtures/reading-browser';

// Actual article geometry needs a browser; state and lifecycle policies are covered by RTL.
// Connect the real content and elapsed-time hook, replacing only analytics transport.
// Next App Router, server rendering, production API and PostHog collection are not covered.
const qualifiedEvents = (page: Page) =>
	page.evaluate(() => window.readingEvents.filter((event) => event.name === 'post read qualified'));

const reachHalf = async (page: Page) => {
	await page.evaluate(() => {
		window.scrollTo(0, 1000);
		window.dispatchEvent(new Event('scroll'));
	});
};

test('실제 긴 본문에서 5초에 절반을 읽으면 스크롤 없이 20초에 한 번 계측한다', async ({ page }) => {
	await page.clock.install();
	await renderReadingContent(page, { postId: 81, articleHeight: 3000 });
	await expect(page.getByRole('article', { name: '게시글 본문' })).toBeVisible();
	await page.clock.runFor(5_000);
	await reachHalf(page);
	await expect
		.poll(() => page.evaluate(() => window.readingEvents.filter((event) => event.name === 'post read engaged').length))
		.toBe(1);
	await expect.poll(() => qualifiedEvents(page)).toHaveLength(0);
	await page.clock.runFor(15_000);
	await expect.poll(() => qualifiedEvents(page)).toHaveLength(1);
	const [event] = await qualifiedEvents(page);
	expect(event.properties).toMatchObject({ postId: 81, engagementSeconds: 20 });
});

test('최초 표시부터 절반이 보이는 짧은 글도 20초 이후에만 계측한다', async ({ page }) => {
	await page.clock.install();
	await renderReadingContent(page, { postId: 83, articleHeight: 200 });
	await expect(page.getByRole('article', { name: '게시글 본문' })).toBeVisible();
	await page.clock.runFor(19_000);
	await expect.poll(() => qualifiedEvents(page)).toHaveLength(0);
	await page.clock.runFor(1_000);
	await expect.poll(() => qualifiedEvents(page)).toHaveLength(1);
	expect((await qualifiedEvents(page))[0].properties).toMatchObject({ postId: 83, engagementSeconds: 20 });
});
