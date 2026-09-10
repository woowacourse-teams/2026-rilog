import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { RELEASE_NOTE_STORAGE_KEY } from '@/features/release-notes/model/release-note-storage';
import { getLatestReleaseNote, RELEASE_NOTES } from '@/features/release-notes/model/release-notes';
import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

const postCards = (page: Page) => page.locator('#post-feed-content article');
const latestReleaseNote = getLatestReleaseNote(RELEASE_NOTES);

test.beforeEach(async ({ page }) => {
	if (latestReleaseNote === undefined) {
		return;
	}

	await page.addInitScript(
		({ id, storageKey }) => {
			localStorage.setItem(storageKey, id);
		},
		{ id: latestReleaseNote.id, storageKey: RELEASE_NOTE_STORAGE_KEY },
	);
});

test('첫 피드를 SSR하고 스크롤에 따라 다음 게시글을 이어서 탐색한다', async ({ page, request }) => {
	const serverResponse = await request.get('/feeds');
	const serverHtml = await serverResponse.text();

	expect(serverResponse.ok()).toBe(true);
	expect(serverHtml).toContain('id="post-feed-content"');
	expect(serverHtml).toMatch(/href="\/@[^\"]+\/posts\/\d+"/);

	await page.goto('/');

	await expect(page).toHaveURL('http://localhost:3000/feeds');
	await expect(page).toHaveTitle(/Rilog/);
	await expect(page.getByRole('heading', { name: 'Rilog' })).toBeVisible();
	const pageFooter = page.getByRole('contentinfo');
	await expect(pageFooter).toHaveCount(1);
	await expect(postCards(page)).toHaveCount(12);
	const initialPostCount = await postCards(page).count();
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
	await expect(page.locator('#post-feed-content ul')).toHaveCSS('grid-template-columns', /\S+ \S+ \S+ \S+/);
	const firstCard = postCards(page).nth(0);
	const secondCard = postCards(page).nth(1);
	const firstMeta = await firstCard.locator('time').boundingBox();
	const secondMeta = await secondCard.locator('time').boundingBox();
	expect(firstMeta?.y).toBe(secondMeta?.y);

	const firstTitle = firstCard.getByRole('heading');
	await expect(firstTitle).toHaveCSS('word-break', 'keep-all');
	await expect(firstTitle).toHaveCSS('overflow-wrap', 'break-word');
	const titleText = firstTitle.locator('span');
	const initialTitleColor = await titleText.evaluate((element) => getComputedStyle(element).color);
	const thumbnail = firstCard.locator('img[alt$="썸네일"]');
	const initialThumbnailBox = await thumbnail.boundingBox();
	await firstCard.hover({ position: { x: 1, y: 1 } });
	await expect(firstCard).toHaveCSS('cursor', 'pointer');
	await expect(titleText).toHaveCSS('color', initialTitleColor);
	await expect
		.poll(async () => (await thumbnail.boundingBox())?.width)
		.toBeGreaterThan(initialThumbnailBox?.width ?? 0);
	const profileLink = firstCard.locator('a').filter({ hasNot: page.getByRole('heading') });
	await profileLink.hover();
	await expect(titleText).toHaveCSS('color', initialTitleColor);
	await expect(profileLink.locator('span').last()).toHaveCSS('text-decoration-line', 'underline');
	await titleText.hover();
	await expect.poll(() => titleText.evaluate((element) => getComputedStyle(element).color)).not.toBe(initialTitleColor);

	await page.mouse.wheel(0, 10_000);
	await expect.poll(() => postCards(page).count()).toBeGreaterThan(initialPostCount);
	await pageFooter.scrollIntoViewIfNeeded();
	await expect(pageFooter).toBeInViewport();
	await expect(page).toHaveURL('http://localhost:3000/feeds');

	await page.setViewportSize({ width: 320, height: 720 });
	await page.reload();
	await expect.poll(() => postCards(page).count()).toBeGreaterThan(0);
	await expect(pageFooter).toHaveCount(1);
	await expect(page.locator('#post-feed-content ul').first()).toHaveCSS('grid-template-columns', /^\S+$/);
	const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
	expect(hasHorizontalOverflow).toBe(false);
});

test('같은 행의 제목 줄 수가 달라도 날짜를 하단에 정렬한다', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/feeds');
	const firstCard = postCards(page).nth(0);
	const secondCard = postCards(page).nth(1);
	const feedGrid = page.locator('#post-feed-content ul');
	await expect(firstCard).toBeVisible();
	await expect(secondCard).toBeVisible();
	await expect(feedGrid).toHaveCSS('grid-template-columns', /\S+ \S+ \S+ \S+/);
	const firstTitle = firstCard.getByRole('heading');
	const secondTitle = secondCard.getByRole('heading');

	await firstTitle.evaluate((element) => {
		element.textContent = '짧은 제목';
	});
	await secondTitle.evaluate((element) => {
		element.textContent = '같은 행에서 두 줄을 차지하는 충분히 긴 게시글 제목입니다';
	});
	await expect
		.poll(async () => (await secondTitle.boundingBox())!.height === (await firstTitle.boundingBox())!.height)
		.toBe(true);
	const firstMeta = await firstCard.locator('time').boundingBox();
	const secondMeta = await secondCard.locator('time').boundingBox();
	expect(Math.round((firstMeta?.y ?? 0) + (firstMeta?.height ?? 0))).toBe(
		Math.round((secondMeta?.y ?? 0) + (secondMeta?.height ?? 0)),
	);

	await secondTitle.evaluate((element) => {
		element.textContent = '다른 짧은 제목';
	});
	await expect
		.poll(async () => Math.round((await secondTitle.boundingBox())!.height))
		.toBe(Math.round((await firstTitle.boundingBox())!.height));
	const firstSingleLineMeta = await firstCard.locator('time').boundingBox();
	const secondSingleLineMeta = await secondCard.locator('time').boundingBox();
	expect(Math.round((firstSingleLineMeta?.y ?? 0) + (firstSingleLineMeta?.height ?? 0))).toBe(
		Math.round((secondSingleLineMeta?.y ?? 0) + (secondSingleLineMeta?.height ?? 0)),
	);

	await page.setViewportSize({ width: 1024, height: 900 });
	await expect(feedGrid).toHaveCSS('grid-template-columns', /\S+ \S+ \S+/);
	await page.setViewportSize({ width: 768, height: 900 });
	await expect(feedGrid).toHaveCSS('grid-template-columns', /\S+ \S+/);
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(feedGrid).toHaveCSS('grid-template-columns', /^\S+$/);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('피드 게시글을 slug가 포함된 상세 URL에서 조회한다', async ({ request }) => {
	const feedResponse = await request.get('/feeds');
	const feedHtml = await feedResponse.text();
	const postHref = feedHtml.match(/href="(\/@[^\"]+\/posts\/\d+)"/)?.[1];

	expect(postHref).toBeDefined();
	const response = await request.get(postHref!);

	expect(response.ok()).toBe(true);
});

test('@가 없는 코로그 경로는 찾을 수 없다', async ({ request }) => {
	const headers = { Cookie: `${PROXY_SESSION_COOKIE_NAME}=${PROXY_SESSION_COOKIE_VALUE}` };
	const homeResponse = await request.get('/rilog', { headers });
	const postResponse = await request.get('/rilog/posts/1', { headers });
	const settingsResponse = await request.get('/rilog/settings?tab=profile', { headers });

	expect(homeResponse.status()).toBe(404);
	expect(postResponse.status()).toBe(404);
	expect(settingsResponse.status()).toBe(404);
});

test('진입 후 피드 시작점으로 이동하고 사용자 스크롤 시 자동 이동을 취소한다', async ({ page }) => {
	const feedContent = page.locator('#post-feed-categories');

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
	await page.waitForTimeout(100);
	await page.mouse.click(100, 100);
	await page.waitForTimeout(1_200);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

	await page.goto('about:blank');
	await page.goto('/feeds');
	await expect(feedContent).toBeVisible();
	await page.waitForTimeout(100);
	await page.mouse.wheel(0, 120);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	const interruptedScrollY = await page.evaluate(() => window.scrollY);

	await page.waitForTimeout(1_200);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(interruptedScrollY);
});

test('제목 텍스트에만 hover 색상을 적용한다', async ({ page }) => {
	await page.goto('/feeds');
	const card = postCards(page).first();
	const heading = card.getByRole('heading');
	const text = heading.locator('span');
	await expect(text).toBeVisible();
	await expect
		.poll(() =>
			page
				.locator('#post-feed-categories')
				.evaluate((element) =>
					Math.abs(
						Math.round(
							element.getBoundingClientRect().top - Number.parseFloat(getComputedStyle(element).scrollMarginTop),
						),
					),
				),
		)
		.toBe(0);
	await page.keyboard.press('Escape');
	await text.evaluate((element) => {
		element.textContent = '짧은 제목';
	});
	await heading.scrollIntoViewIfNeeded();
	const box = (await heading.boundingBox())!;
	await page.mouse.move(box.x + box.width, box.y + box.height);
	const normalColor = await text.evaluate((element) => getComputedStyle(element).color);
	await text.hover();
	await expect.poll(() => text.evaluate((element) => getComputedStyle(element).color)).not.toBe(normalColor);
	await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2);
	await expect(text).toHaveCSS('color', normalColor);
	for (const area of [card.locator('img[alt$="썸네일"]'), card.locator('time')]) {
		await area.scrollIntoViewIfNeeded();
		const bounds = (await area.boundingBox())!;
		await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
		await expect(text).toHaveCSS('color', normalColor);
	}
	await card
		.locator('a')
		.filter({ hasNot: page.getByRole('heading') })
		.hover();
	await expect(text).toHaveCSS('color', normalColor);
});

test.describe('모바일 카드 피드백', () => {
	test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
	test('hover 없는 모바일 환경에서 제목과 홈 링크의 active 피드백을 표시한다', async ({ page }) => {
		await page.goto('/feeds');
		const card = postCards(page).first();
		const title = card.getByRole('heading').locator('span');
		const home = card.locator('a').filter({ hasNot: page.getByRole('heading') });
		await expect(title).toBeVisible();
		await expect
			.poll(() =>
				page
					.locator('#post-feed-categories')
					.evaluate((element) =>
						Math.abs(
							Math.round(
								element.getBoundingClientRect().top - Number.parseFloat(getComputedStyle(element).scrollMarginTop),
							),
						),
					),
			)
			.toBe(0);
		expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
		for (const target of [title, home]) {
			await target.scrollIntoViewIfNeeded();
			const bounds = (await target.boundingBox())!;
			const normalColor = await target.evaluate((element) => getComputedStyle(element).color);
			await page.mouse.move(bounds.x + 4, bounds.y + bounds.height / 2);
			await page.mouse.down();
			await expect.poll(() => target.evaluate((element) => getComputedStyle(element).color)).not.toBe(normalColor);
			if (target === home) await expect(home.locator('span').last()).toHaveCSS('text-decoration-line', 'underline');
			await page.mouse.move(0, 0);
			await page.mouse.up();
			await expect(target).toHaveCSS('color', normalColor);
		}
	});
});
