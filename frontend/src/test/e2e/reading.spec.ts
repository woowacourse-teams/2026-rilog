import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { renderReadingContent } from './fixtures/reading-browser';

// Actual article geometry needs a browser; state and lifecycle policies are covered by RTL.
// Connect the real content and elapsed-time hook, replacing only analytics transport.
// Next App Router, server rendering, production API and PostHog collection are not covered.
const progressEvents = (page: Page) =>
	page.evaluate(() => window.readingEvents.filter((event) => event.name === 'post reading progress'));

const reachHalf = async (page: Page) => {
	await page.evaluate(() => {
		window.scrollTo(0, 1000);
		window.dispatchEvent(new Event('scroll'));
	});
};

test('실제 긴 본문에서 5초에 절반을 읽으면 첫 도달과 이후 누적 시간을 기록한다', async ({ page }) => {
	await page.clock.install();
	await renderReadingContent(page, { postId: 81, articleHeight: 3000 });
	await expect(page.getByRole('article', { name: '게시글 본문' })).toBeVisible();
	await page.clock.runFor(5_000);
	await reachHalf(page);
	await expect
		.poll(() => page.evaluate(() => window.readingEvents.filter((event) => event.name === 'post read engaged').length))
		.toBe(1);
	await expect.poll(() => progressEvents(page)).toHaveLength(1);
	expect((await progressEvents(page))[0].properties).toMatchObject({
		postId: 81,
		hasReached50Percent: true,
	});
	expect((await progressEvents(page))[0].properties.engagementSeconds).toBeGreaterThanOrEqual(5);
	expect((await progressEvents(page))[0].properties.engagementSeconds).toBeLessThan(6);
	await page.clock.runFor(15_000);
	await expect.poll(() => progressEvents(page)).toHaveLength(3);
	expect((await progressEvents(page))[2].properties).toMatchObject({ postId: 81, hasReached50Percent: true });
	expect((await progressEvents(page))[2].properties.engagementSeconds).toBeGreaterThanOrEqual(20);
});

test('최초 표시부터 절반이 보이는 짧은 글은 처음부터 도달 이력을 기록한다', async ({ page }) => {
	await page.clock.install();
	await renderReadingContent(page, { postId: 83, articleHeight: 200 });
	await expect(page.getByRole('article', { name: '게시글 본문' })).toBeVisible();
	await expect.poll(() => progressEvents(page)).toHaveLength(1);
	expect((await progressEvents(page))[0].properties).toMatchObject({
		postId: 83,
		hasReached50Percent: true,
	});
	expect((await progressEvents(page))[0].properties.engagementSeconds).toBeLessThan(1);
	await page.clock.runFor(10_000);
	await expect.poll(() => progressEvents(page)).toHaveLength(2);
	expect((await progressEvents(page))[1].properties).toMatchObject({ postId: 83, hasReached50Percent: true });
	expect((await progressEvents(page))[1].properties.engagementSeconds).toBeGreaterThanOrEqual(10);
});
