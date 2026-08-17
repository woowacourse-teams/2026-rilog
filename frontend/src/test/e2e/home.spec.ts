import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const postLinks = (page: Page) => page.locator('a[href^="/@"][href*="/posts/"]');

test('첫 피드를 SSR하고 스크롤에 따라 다음 게시글을 이어서 탐색한다', async ({ page, request }) => {
	// TODO(API 연동): API 응답을 fixture로 고정해 게시글 문구와 페이지 개수를 결정적으로 검증
	const serverResponse = await request.get('/feeds');
	const serverHtml = await serverResponse.text();

	expect(serverResponse.ok()).toBe(true);
	expect(serverHtml).toContain('React 19에서 달라진 렌더링 흐름 이해하기');
	expect(serverHtml).toContain('href="/@author-1/posts/1"');

	await page.goto('/');

	await expect(page).toHaveURL('http://localhost:3000/feeds');
	await expect(page).toHaveTitle(/Rilog/);
	await expect(page.getByRole('heading', { name: 'Rilog' })).toBeVisible();
	await expect(postLinks(page)).toHaveCount(12);
	const viewportWidth = page.viewportSize()?.width;
	await expect
		.poll(async () => {
			const logoBox = await page.locator('main > header img').boundingBox();
			const sidebarBox = await page.getByRole('complementary', { name: '사이드바' }).boundingBox();
			return logoBox === null || sidebarBox === null || viewportWidth === undefined
				? null
				: Math.round(logoBox.x + logoBox.width / 2 - (sidebarBox.x + sidebarBox.width + viewportWidth) / 2);
		})
		.toBe(0);
	await expect(page.locator('ul')).toHaveCSS('grid-template-columns', /\S+ \S+ \S+ \S+/);
	const firstCard = postLinks(page).nth(0);
	const secondCard = postLinks(page).nth(1);
	const firstMeta = await firstCard.locator('time').boundingBox();
	const secondMeta = await secondCard.locator('time').boundingBox();
	expect(firstMeta?.y).toBe(secondMeta?.y);

	const firstTitle = firstCard.getByRole('heading');
	await expect(firstTitle).toHaveCSS('word-break', 'keep-all');
	await expect(firstTitle).toHaveCSS('overflow-wrap', 'break-word');
	const initialTitleColor = await firstTitle.evaluate((element) => getComputedStyle(element).color);
	const thumbnail = firstCard.locator('img[alt$="썸네일"]');
	const initialThumbnailBox = await thumbnail.boundingBox();
	await firstCard.hover();
	await expect
		.poll(() => firstTitle.evaluate((element) => getComputedStyle(element).color))
		.not.toBe(initialTitleColor);
	await expect
		.poll(async () => (await thumbnail.boundingBox())?.width)
		.toBeGreaterThan(initialThumbnailBox?.width ?? 0);

	await page.mouse.wheel(0, 10_000);
	await expect(postLinks(page)).toHaveCount(24);
	await page.mouse.wheel(0, 10_000);
	await expect(postLinks(page)).toHaveCount(36);
	await expect(page.getByText('모든 게시글을 확인했어요.')).not.toBeAttached();
	await expect(page).toHaveURL('http://localhost:3000/feeds');

	await page.setViewportSize({ width: 320, height: 720 });
	await page.reload();
	await expect(postLinks(page)).toHaveCount(12);
	await expect(page.locator('ul')).toHaveCSS('grid-template-columns', /^\S+$/);
	const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
	expect(hasHorizontalOverflow).toBe(false);
});

test('피드 게시글을 slug가 포함된 상세 URL에서 조회한다', async ({ request }) => {
	const response = await request.get('/@author-1/posts/1');

	expect(response.ok()).toBe(true);
	expect(await response.text()).toContain('컴포넌트 시스템, 이렇게 도입했어요');
});

test('@가 없는 코로그 경로는 찾을 수 없다', async ({ request }) => {
	const homeResponse = await request.get('/rilog');
	const postResponse = await request.get('/rilog/posts/1');
	const settingsResponse = await request.get('/rilog/settings?tab=profile');

	expect(homeResponse.status()).toBe(404);
	expect(postResponse.status()).toBe(404);
	expect(settingsResponse.status()).toBe(404);
});

test('진입 후 피드 시작점으로 이동하고 사용자 스크롤 시 자동 이동을 취소한다', async ({ page }) => {
	const feedContent = page.locator('#post-feed-content');

	await page.goto('/feeds');
	await expect(feedContent).toBeVisible();
	await expect
		.poll(() =>
			feedContent.evaluate((element) => {
				const scrollMarginTop = Number.parseFloat(getComputedStyle(element).scrollMarginTop);

				return Math.abs(Math.round(element.getBoundingClientRect().top - scrollMarginTop));
			}),
		)
		.toBe(0);
	await expect(page.locator('main > header img')).not.toBeInViewport();

	await page.goto('about:blank');
	await page.goto('/feeds');
	await expect(feedContent).toBeVisible();
	await page.mouse.click(100, 100);
	await page.waitForTimeout(1_200);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

	await page.goto('about:blank');
	await page.goto('/feeds');
	await expect(feedContent).toBeVisible();
	await page.mouse.wheel(0, 120);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	const interruptedScrollY = await page.evaluate(() => window.scrollY);

	await page.waitForTimeout(1_200);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(interruptedScrollY);
});
