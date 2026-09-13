import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { POST_FEED_SCROLL_TARGET_ID } from '@/features/post-feed/lib/navigate-feed-filter';
import { RELEASE_NOTE_STORAGE_KEY } from '@/features/release-notes/model/release-note-storage';
import { getLatestReleaseNote, RELEASE_NOTES } from '@/features/release-notes/model/release-notes';
import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

const POST_FEED_HEADER_ID = 'post-feed-categories';
const postCards = (page: Page) => page.locator('#post-feed-content article');
const postFeedHeader = (page: Page) => page.locator(`#${POST_FEED_HEADER_ID}`);
const postFeedScrollTarget = (page: Page) => page.locator(`#${POST_FEED_SCROLL_TARGET_ID}`);
const latestReleaseNote = getLatestReleaseNote(RELEASE_NOTES);

const expectFeedHeaderAligned = async (page: Page) => {
	const feedHeader = postFeedHeader(page);
	const scrollTarget = postFeedScrollTarget(page);
	await expect(feedHeader).toBeVisible();
	await expect(scrollTarget).toBeAttached();
	await expect
		.poll(async () => {
			const [headerBox, stickyTop, scrollMarginTop] = await Promise.all([
				feedHeader.boundingBox(),
				feedHeader.evaluate((element) => Number.parseFloat(getComputedStyle(element).top)),
				scrollTarget.evaluate((element) => Number.parseFloat(getComputedStyle(element).scrollMarginTop)),
			]);

			return headerBox === null
				? null
				: Math.max(Math.abs(headerBox.y - stickyTop), Math.abs(scrollMarginTop - stickyTop));
		})
		.toBeLessThanOrEqual(1);
	await expect(feedHeader).not.toHaveClass(/-translate-y-full/);
	await expect(feedHeader).toBeInViewport();
};

const scrollFeedDeepAndRevealHeader = async (page: Page, stickyTop: number) => {
	const feedHeader = postFeedHeader(page);
	await page.addStyleTag({ content: '#post-feed-content { min-height: 2400px !important; }' });
	await page.mouse.move(500, 400);
	await page.mouse.wheel(0, 1_000);
	await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })));
	await page.evaluate(() => window.scrollBy({ top: 1_000, behavior: 'auto' }));
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
	await expect
		.poll(async () => {
			const box = await feedHeader.boundingBox();
			return box === null ? null : box.y + box.height <= stickyTop;
		})
		.toBe(true);
	await page.mouse.wheel(0, -25);
	await expect
		.poll(async () => {
			const box = await feedHeader.boundingBox();
			return box !== null && Math.abs(box.y - stickyTop) <= 1 && box.y + box.height > stickyTop;
		})
		.toBe(true);
};

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
	await expect(page.getByRole('heading', { level: 2, name: 'All.' })).toBeVisible();
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
	const profileImage = profileLink.locator(':scope > span').first();
	await expect(profileImage).toHaveCSS('width', '24px');
	await expect(profileImage).toHaveCSS('height', '24px');
	await expect(profileImage).toHaveCSS('border-width', '1px');
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

test('직접 일상 필터 URL을 열면 SSR 결과를 hydrate하고 브라우저에서 피드를 다시 요청하지 않는다', async ({ page }) => {
	let browserFeedRequestCount = 0;
	page.on('request', (request) => {
		if (new URL(request.url()).pathname === '/v1/feeds/posts') browserFeedRequestCount += 1;
	});
	await page.route('**/v1/feeds/posts?**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: 'OK',
				data: { posts: [], page: 0, size: 12, numberOfElements: 0, hasNext: false },
			}),
		});
	});

	const response = await page.goto('/feeds?category=daily');
	const serverHtml = await response?.text();

	expect(serverHtml).toContain('id="post-feed-content"');
	expect(serverHtml).toContain('href="/feeds?category=daily"');
	await expect(page.getByRole('link', { name: '일상', exact: true })).toHaveAttribute('aria-current', 'page');
	await expect(page.locator('#post-feed-content')).toBeVisible();
	await page.waitForLoadState('networkidle');
	expect(browserFeedRequestCount).toBe(0);
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
	const feedHeader = postFeedHeader(page);

	await page.goto('/feeds');
	await expectFeedHeaderAligned(page);
	await expect(page.locator('main > header img')).not.toBeInViewport();

	await page.goto('about:blank');
	await page.goto('/feeds');
	await expect(feedHeader).toBeVisible();
	await page.waitForTimeout(100);
	await page.mouse.click(100, 100);
	await page.waitForTimeout(1_200);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

	await page.goto('about:blank');
	await page.goto('/feeds');
	await expect(feedHeader).toBeVisible();
	await page.waitForTimeout(100);
	await page.mouse.wheel(0, 120);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	const interruptedScrollY = await page.evaluate(() => window.scrollY);

	await page.waitForTimeout(1_200);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(interruptedScrollY);
});

test('피드 헤더는 sticky 전환 방향과 모바일 겹침/오버플로를 처리한다', async ({ page }) => {
	await page.goto('/feeds');
	const feedHeader = postFeedHeader(page);
	const expectHeaderHidden = async (stickyTop: number) => {
		await expect
			.poll(async () => {
				const box = await feedHeader.boundingBox();
				return box === null ? null : box.y + box.height <= stickyTop;
			})
			.toBe(true);
	};
	const expectHeaderShown = async (stickyTop: number) => {
		await expect
			.poll(async () => {
				const box = await feedHeader.boundingBox();
				return box !== null && box.y >= stickyTop && box.y + box.height > stickyTop;
			})
			.toBe(true);
	};
	const expectNoHorizontalOverflow = async () => {
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	};

	await expectFeedHeaderAligned(page);
	await page.waitForTimeout(1_200);
	await page.addStyleTag({ content: '#post-feed-content { min-height: 2000px !important; }' });

	await feedHeader.getByRole('link').first().focus();
	await page.mouse.move(500, 400);
	await page.mouse.wheel(0, 1_000);
	await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })));
	await page.evaluate(() => window.scrollBy({ top: 1_000, behavior: 'auto' }));
	await expectHeaderHidden(0);

	await page.mouse.wheel(0, -10);
	await expectHeaderHidden(0);
	await page.mouse.wheel(0, -15);
	await expectHeaderShown(0);
	await page.keyboard.press('ArrowUp');
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
	await expectHeaderShown(0);

	await page.setViewportSize({ width: 390, height: 844 });
	await page.reload();
	await expectFeedHeaderAligned(page);
	await page.mouse.move(200, 400);
	await page.mouse.wheel(0, 1_000);
	await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })));
	await page.evaluate(() => window.scrollBy({ top: 1_000, behavior: 'auto' }));
	await expectHeaderHidden(64);
	await page.mouse.wheel(0, -10);
	await expectHeaderHidden(64);
	await page.mouse.wheel(0, -15);
	await expectHeaderShown(64);
	await page.keyboard.press('ArrowUp');
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
	await expectHeaderShown(64);

	const mobileHeader = page.locator('[data-mobile-header]');
	const mobileHeaderBox = await mobileHeader.boundingBox();
	const visibleFeedHeaderBox = await feedHeader.boundingBox();
	expect(visibleFeedHeaderBox?.y).toBeGreaterThanOrEqual((mobileHeaderBox?.y ?? 0) + (mobileHeaderBox?.height ?? 0));
	await expectNoHorizontalOverflow();

	const categoryLinks = feedHeader.getByRole('link');
	await categoryLinks.first().focus();
	await page.keyboard.press('Tab');
	const focusedCategoryLink = categoryLinks.nth(1);
	await expect(focusedCategoryLink).toBeFocused();
	await expect(focusedCategoryLink).toHaveCSS('outline-style', 'solid');
	await expect(focusedCategoryLink).toHaveCSS('outline-width', '2px');
	await expect(focusedCategoryLink).toHaveCSS('outline-offset', '2px');

	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.reload();
	await expect(feedHeader).toBeVisible();
	expect(await feedHeader.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe('none');
	await page.mouse.move(200, 400);
	await page.mouse.wheel(0, 1_000);
	await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })));
	await page.evaluate(() => window.scrollBy({ top: 1_000, behavior: 'auto' }));
	await expectHeaderHidden(64);
	await page.mouse.wheel(0, -10);
	await expectHeaderHidden(64);
	await page.mouse.wheel(0, -15);
	await expectHeaderShown(64);
	await page.keyboard.press('ArrowUp');
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
	await expectHeaderShown(64);

	await page.setViewportSize({ width: 320, height: 720 });
	await page.reload();
	await expect(feedHeader).toBeVisible();
	await expectNoHorizontalOverflow();

	await page.setViewportSize({ width: 390, height: 844 });
	await page.reload();
	await expect(feedHeader).toBeVisible();
	await expectNoHorizontalOverflow();
});
test('개인 회고 피드에서 Feed로 이동하면 범위와 카테고리를 모두 전체로 초기화한다', async ({ page }) => {
	await page.goto('/feeds?blogType=personal&category=retrospect');
	const primaryNavigation = page.getByRole('navigation', { name: '주요 메뉴' });

	await primaryNavigation.getByRole('link').first().click();

	await expect(page).toHaveURL('/feeds');
	await expect(page.getByRole('heading', { level: 2, name: 'All.' })).toBeVisible();
	await expect(page.getByRole('link', { name: '전체', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('페이지 최상단에서 카테고리를 선택해도 피드 헤더를 sticky 위치에 표시한다', async ({ page }) => {
	await page.goto('/feeds');
	await expectFeedHeaderAligned(page);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
	await postFeedHeader(page).getByRole('link', { name: '기술', exact: true }).dispatchEvent('click', { button: 0 });

	await expect(page).toHaveURL(/category=tech/);
	await expectFeedHeaderAligned(page);
});

test('깊은 위치에서 사이드바 탭을 바꾸는 동안 헤더가 고정된 위치를 유지한다', async ({ page }) => {
	await page.goto('/feeds');
	await expectFeedHeaderAligned(page);
	await page.addStyleTag({ content: '#post-feed-content { min-height: 2400px !important; }' });
	await page.mouse.wheel(0, 1_000);
	await page.evaluate(() => window.scrollBy({ top: 1_000, behavior: 'auto' }));
	const feedHeader = postFeedHeader(page);
	await expect
		.poll(async () => {
			const box = await feedHeader.boundingBox();
			return box === null ? null : box.y + box.height <= 0;
		})
		.toBe(true);

	await page.evaluate(() => {
		const header = document.getElementById('post-feed-categories')!;
		const trackedWindow = window as Window & { feedHeaderScrollPositions?: number[] };
		trackedWindow.feedHeaderScrollPositions = [];
		window.addEventListener(
			'scroll',
			() => {
				if (location.search.includes('blogType=personal')) {
					trackedWindow.feedHeaderScrollPositions?.push(header.getBoundingClientRect().top);
				}
			},
			{ passive: true },
		);
	});
	await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '개인' }).click();
	await expect(page).toHaveURL(/blogType=personal/);
	await expectFeedHeaderAligned(page);
	const headerPositions = await page.evaluate(
		() => (window as Window & { feedHeaderScrollPositions?: number[] }).feedHeaderScrollPositions ?? [],
	);
	expect(headerPositions.length).toBeGreaterThan(1);
	expect(headerPositions.every((top) => top >= -1)).toBe(true);
});

test('피드 필터 cache는 history 탐색에도 API, RSC, skeleton을 다시 만들지 않는다', async ({ page }) => {
	let dailyRequestCount = 0;
	let browserFeedRequestCount = 0;
	const rscRequests: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname === '/v1/feeds/posts') browserFeedRequestCount += 1;
		if (url.pathname === '/feeds' && (url.searchParams.has('_rsc') || request.headers().rsc === '1')) {
			rscRequests.push(request.url());
		}
	});
	await page.route('**/v1/feeds/posts?**', async (route) => {
		const url = new URL(route.request().url());
		if (url.searchParams.get('category') === 'DAILY' && !url.searchParams.has('blogType')) {
			dailyRequestCount += 1;
		}

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: 'OK',
				data: {
					posts: [],
					page: Number(url.searchParams.get('page') ?? 0),
					size: 12,
					numberOfElements: 0,
					hasNext: false,
				},
			}),
		});
	});
	await page.goto('/feeds');
	await expectFeedHeaderAligned(page);

	await page.evaluate(() => {
		const trackedWindow = window as Window & {
			feedSkeletonTransitions?: number;
		};
		trackedWindow.feedSkeletonTransitions = 0;
		let wasSkeletonVisible = false;
		new MutationObserver(() => {
			const isSkeletonVisible = document.querySelector('[aria-label="피드를 불러오는 중"]') !== null;
			if (isSkeletonVisible && !wasSkeletonVisible) {
				trackedWindow.feedSkeletonTransitions = (trackedWindow.feedSkeletonTransitions ?? 0) + 1;
			}
			wasSkeletonVisible = isSkeletonVisible;
		}).observe(document.body, { childList: true, subtree: true });
	});

	await scrollFeedDeepAndRevealHeader(page, 0);
	await page.getByRole('link', { name: '일상', exact: true }).click();
	await expect(page).toHaveURL(/category=daily/);
	await expectFeedHeaderAligned(page);
	await expect(page.getByRole('link', { name: '일상', exact: true })).toHaveAttribute('aria-current', 'page');
	await expect(page.getByText('아직 발행된 게시글이 없어요.')).toBeVisible();
	const skeletonTransitionsAfterFirstVisit = await page.evaluate(
		() => (window as Window & { feedSkeletonTransitions?: number }).feedSkeletonTransitions ?? 0,
	);
	expect(dailyRequestCount).toBe(1);

	await page.getByRole('link', { name: '전체', exact: true }).click();
	await expect(page).toHaveURL(/\/feeds$/);
	await expect(page.getByRole('link', { name: '전체', exact: true })).toHaveAttribute('aria-current', 'page');
	const apiRequestsBeforeHistoryNavigation = browserFeedRequestCount;
	const rscRequestsBeforeHistoryNavigation = rscRequests.length;
	await page.goBack();
	await expect(page).toHaveURL(/category=daily/);
	await expect(page.getByRole('link', { name: '일상', exact: true })).toHaveAttribute('aria-current', 'page');
	await expect(page.getByText('아직 발행된 게시글이 없어요.')).toBeVisible();
	await page.goForward();
	await expect(page).toHaveURL(/\/feeds$/);
	await expect(page.getByRole('link', { name: '전체', exact: true })).toHaveAttribute('aria-current', 'page');
	expect(dailyRequestCount).toBe(1);
	expect(browserFeedRequestCount).toBe(apiRequestsBeforeHistoryNavigation);
	expect(rscRequests).toHaveLength(rscRequestsBeforeHistoryNavigation);
	expect(
		await page.evaluate(() => (window as Window & { feedSkeletonTransitions?: number }).feedSkeletonTransitions ?? 0),
	).toBe(skeletonTransitionsAfterFirstVisit);

	await page.getByRole('link', { name: '일상', exact: true }).click();
	await expect(page).toHaveURL(/category=daily/);
	await scrollFeedDeepAndRevealHeader(page, 0);
	await page.getByRole('link', { name: '개인', exact: true }).click();
	await expect(page).toHaveURL('/feeds?blogType=personal');
	await expectFeedHeaderAligned(page);
	await expect(page.getByRole('link', { name: '전체', exact: true })).toHaveAttribute('aria-current', 'page');
	await expect(page.getByRole('heading', { level: 2, name: 'Personal.' })).toBeVisible();
	await page.getByRole('link', { name: 'Colog', exact: true }).click();
	await expect(page).toHaveURL('/feeds?blogType=colog');
	await expectFeedHeaderAligned(page);
	await expect(page.getByRole('heading', { level: 2, name: 'Colog.' })).toBeVisible();
	await page.waitForTimeout(1_200);

	expect(rscRequests).toHaveLength(0);
	await expectFeedHeaderAligned(page);
});

test.describe('모바일 피드 필터 기준점', () => {
	test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });

	test('깊은 스크롤에서 카테고리를 바꾸면 모바일 헤더 아래에 피드 헤더를 표시한다', async ({ page }) => {
		await page.goto('/feeds');
		await expectFeedHeaderAligned(page);
		await expect
			.poll(() =>
				postFeedScrollTarget(page).evaluate((element) => Number.parseFloat(getComputedStyle(element).scrollMarginTop)),
			)
			.toBe(64);

		await scrollFeedDeepAndRevealHeader(page, 64);
		await postFeedHeader(page).getByRole('link', { name: '일상', exact: true }).click();

		await expect(page).toHaveURL(/category=daily/);
		await expectFeedHeaderAligned(page);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	});
});

test('수정키 클릭은 client filter navigation을 실행하지 않는다', async ({ page }) => {
	await page.goto('/feeds');
	const currentUrl = page.url();
	await page.evaluate(() => {
		const trackedWindow = window as Window & { feedFilterPushStateCallCount?: number };
		const originalPushState = window.history.pushState.bind(window.history);
		trackedWindow.feedFilterPushStateCallCount = 0;
		window.history.pushState = (...args) => {
			trackedWindow.feedFilterPushStateCallCount = (trackedWindow.feedFilterPushStateCallCount ?? 0) + 1;
			return originalPushState(...args);
		};
	});

	await page.getByRole('link', { name: '일상', exact: true }).dispatchEvent('click', {
		metaKey: true,
		ctrlKey: true,
		button: 0,
	});

	await expect(page).toHaveURL(currentUrl);
	expect(
		await page.evaluate(
			() => (window as Window & { feedFilterPushStateCallCount?: number }).feedFilterPushStateCallCount,
		),
	).toBe(0);
});

test('제목 텍스트에만 hover 색상을 적용한다', async ({ page }) => {
	await page.goto('/feeds');
	const card = postCards(page).first();
	const heading = card.getByRole('heading');
	const text = heading.locator('span');
	await expect(text).toBeVisible();
	await expectFeedHeaderAligned(page);
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
		await expectFeedHeaderAligned(page);
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
