import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

test.beforeEach(async ({ page }) => {
	await page.route('**/v1/auth/token/refresh', (route) => route.fulfill({ status: 204 }));
	await page.route('**/v1/posts/count', (route) => route.fulfill({ json: { data: { totalPostsCount: 123 } } }));
	// Public feed content remains the same for all three local selections.
	await page.route('**/v1/feeds/posts?*', (route) =>
		route.fulfill({
			json: {
				data: {
					posts: [
						{
							postId: 1,
							title: '사이드바 검증 게시글',
							thumbnailImageUrl: null,
							category: 'TECH',
							visibility: 'PUBLIC',
							publishedAt: '2026-09-08T00:00:00',
							author: { userId: 1, nickname: '테스터', slug: 'sidebar-user', profileImageUrl: null },
							owner: { type: 'RILOG', blogId: 1, slug: 'sidebar-user', name: '테스터', profileImageUrl: null },
						},
					],
					page: 0,
					size: 12,
					numberOfElements: 1,
					hasNext: false,
				},
			},
		}),
	);
	await page.route('**/_next/image?*', (route) =>
		route.fulfill({
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"/>',
		}),
	);
});

async function openFeed(page: Page) {
	await page.goto('/feeds');
	const dismiss = page.getByRole('button', { name: '이 업데이트 다시 보지 않기' });
	await dismiss.click();
	await expect(page.locator('dialog[open]')).toHaveCount(0);
	await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
	await page.getByRole('navigation', { name: '주요 메뉴', exact: true }).waitFor();
	await page.mouse.click(600, 50);
}

test('비로그인 메뉴 선택 후에도 hover 중에만 펼쳐지고 35px 크기를 유지한다', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	await openFeed(page);
	const sidebar = page.getByRole('complementary', { name: '사이드바' });
	const navigation = sidebar.getByRole('navigation', { name: '주요 메뉴', exact: true });
	const feed = navigation.getByRole('link', { name: /피드 글/ });
	const personal = navigation.getByRole('link', { name: '개인', exact: true });
	const colog = navigation.getByRole('link', { name: 'Colog', exact: true });
	const loginButton = sidebar.getByRole('button', { name: '로그인' });
	await expect(page).toHaveTitle(/Rilog/);
	await expect(loginButton).toBeVisible();
	await expect(sidebar).toHaveCSS('width', '70px');
	for (const link of [feed, personal, colog]) {
		await expect(link).toBeVisible();
		await expect(link).toHaveCSS('width', '35px');
		await expect(link).toHaveCSS('height', '35px');
		await expect(link.locator('svg')).toHaveCSS('width', '20px');
		await expect(link.locator('svg')).toHaveCSS('height', '20px');
	}
	await expect(feed).toHaveAttribute('aria-current', 'page');
	await personal.hover();
	await expect(sidebar).toHaveCSS('width', '240px');
	for (const icon of await navigation.locator('svg').all()) {
		await expect(icon).toHaveCSS('width', '20px');
		await expect(icon).toHaveCSS('height', '20px');
		await expect(icon.locator('..')).toHaveCSS('height', '35px');
	}
	const [loginButtonBox, loginLabelBox] = await Promise.all([
		loginButton.boundingBox(),
		loginButton.getByText('로그인', { exact: true }).boundingBox(),
	]);
	if (loginButtonBox === null || loginLabelBox === null) {
		throw new Error('로그인 버튼의 위치를 확인할 수 없습니다.');
	}
	expect(loginLabelBox.x + loginLabelBox.width / 2).toBeCloseTo(loginButtonBox.x + loginButtonBox.width / 2, 1);
	await sidebar.screenshot({ path: '/tmp/rilog-sidebar-guest-hover.png' });
	const cards = page.locator('#post-feed-content article a');
	await expect(cards.first()).toBeVisible();
	const links = await cards.evaluateAll((items) => items.map((item) => item.getAttribute('href')));
	for (const link of [personal, colog, feed]) {
		await link.hover();
		await expect(sidebar).toHaveCSS('width', '240px');
		await link.click();
		await expect(link).toHaveAttribute('aria-current', 'page');
		await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
		await expect(feed).toHaveAccessibleName('피드 글 123개');
		expect(await cards.evaluateAll((items) => items.map((item) => item.getAttribute('href')))).toEqual(links);
		await page.mouse.move(600, 50);
		await expect(sidebar).toHaveCSS('width', '70px');
	}
	await sidebar.screenshot({ path: '/tmp/rilog-sidebar-guest-collapsed.png' });
	await feed.focus();
	await page.keyboard.press('Tab');
	await expect(personal).toBeFocused();
	await expect(sidebar).toHaveCSS('width', '70px');
	await page.keyboard.press('Enter');
	await expect(personal).toHaveAttribute('aria-current', 'page');
	await expect(sidebar).toHaveCSS('width', '70px');
	await expect(personal).toHaveCSS('outline-style', 'solid');
	await expect(personal).toHaveCSS('background-color', 'rgb(237, 241, 247)');
	await sidebar.screenshot({ path: '/tmp/rilog-sidebar-keyboard.png' });
	await loginButton.click();
	await expect(page.getByRole('dialog')).toBeVisible();
	expect(errors).toEqual([]);
});

test('로그인 코로그 이미지, 기존 이동과 다른 페이지에서 하위 선택을 유지한다', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	await mockAuthenticatedAccess(page);
	await page.route('**/v1/auth/token/refresh', (route) =>
		route.fulfill({
			status: 204,
			headers: {
				Authorization: 'Bearer e2e-access-token',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Origin': new URL(page.url()).origin,
				'Access-Control-Expose-Headers': 'Authorization',
			},
		}),
	);
	await page.route('**/v1/users/me/cologs/overview', (route) =>
		route.fulfill({
			json: {
				data: [
					{
						cologId: 1,
						slug: 'sidebar-team',
						name: '우아한형제들',
						profileImageUrl: '/images/colog-placeholder.svg',
						chapters: [],
					},
				],
			},
		}),
	);
	await page.route('**/v1/auth/logout', (route) => route.fulfill({ status: 204 }));
	await openFeed(page);
	const sidebar = page.getByRole('complementary', { name: '사이드바' });
	const team = sidebar.getByRole('link', { name: '우아한형제들' });
	const createTeam = sidebar.getByRole('link', { name: '팀 만들기' });
	await expect(team).toBeVisible();
	await expectStationarySidebarIcons(page);
	await expect(sidebar).toHaveCSS('width', '70px');
	await expect(team.locator(':scope > span').first()).toHaveCSS('width', '35px');
	await expect(team.locator(':scope > span').first()).toHaveCSS('height', '35px');
	await expect(createTeam).toHaveCSS('width', '35px');
	await expect(createTeam).toHaveCSS('height', '35px');
	const [teamBox, createTeamBox] = await Promise.all([team.boundingBox(), createTeam.boundingBox()]);
	if (teamBox === null || createTeamBox === null) throw new Error('사이드바 링크의 위치를 확인할 수 없습니다.');
	expect(createTeamBox.x + createTeamBox.width / 2).toBeCloseTo(teamBox.x + teamBox.width / 2, 1);
	await sidebar.screenshot({ path: '/tmp/rilog-sidebar-auth-collapsed.png' });
	await team.hover();
	await expect(sidebar).toHaveCSS('width', '240px');
	await expect(team.locator(':scope > span').first()).toHaveCSS('width', '35px');
	await expect(team.locator(':scope > span').first()).toHaveCSS('height', '35px');
	await expect(createTeam).toHaveCSS('height', '35px');
	const writeLink = sidebar.getByRole('link', { name: '글쓰기' });
	const [expandedCreateTeamBox, createTeamLabelBox] = await Promise.all([
		createTeam.boundingBox(),
		createTeam.getByText('팀 만들기', { exact: true }).boundingBox(),
	]);
	if (expandedCreateTeamBox === null || createTeamLabelBox === null) {
		throw new Error('팀 만들기 버튼의 위치를 확인할 수 없습니다.');
	}
	expect(createTeamLabelBox.x + createTeamLabelBox.width / 2).toBeCloseTo(
		expandedCreateTeamBox.x + expandedCreateTeamBox.width / 2,
		1,
	);
	const [writeLinkBox, writeLabelBox] = await Promise.all([
		writeLink.boundingBox(),
		writeLink.getByText('글쓰기', { exact: true }).boundingBox(),
	]);
	if (writeLinkBox === null || writeLabelBox === null) {
		throw new Error('글쓰기 버튼의 위치를 확인할 수 없습니다.');
	}
	expect(writeLabelBox.x + writeLabelBox.width / 2).toBeCloseTo(writeLinkBox.x + writeLinkBox.width / 2, 1);
	const personal = sidebar.getByRole('link', { name: '개인', exact: true });
	await personal.click();
	await expect(personal).toHaveAttribute('aria-current', 'page');
	await expect(personal).toHaveCSS('background-color', 'rgb(237, 241, 247)');
	await sidebar.screenshot({ path: '/tmp/rilog-sidebar-auth-personal.png' });
	await expect(team).toHaveAttribute('href', '/@sidebar-team');
	await expect(sidebar.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write');
	await createTeam.click();
	await expect(page).toHaveURL(/\/colog\/create$/);
	await sidebar.getByRole('link', { name: 'Colog', exact: true }).click();
	await expect(page).toHaveURL(/\/feeds$/);
	await expect(sidebar.getByRole('link', { name: 'Colog', exact: true })).toHaveAttribute('aria-current', 'page');
	await expect(sidebar.locator('nav[aria-label="주요 메뉴"] [aria-current="page"]')).toHaveCount(1);
	const nickname = sidebar.locator('footer strong');
	await nickname.evaluate((element) => {
		element.textContent = '아주 긴 닉네임을 사용해도 로그아웃 버튼을 가리지 않습니다';
	});
	const logout = sidebar.getByRole('button', { name: '로그아웃' });
	const nicknameBox = (await nickname.boundingBox())!;
	const logoutBox = (await logout.boundingBox())!;
	expect(nicknameBox.x + nicknameBox.width).toBeLessThanOrEqual(logoutBox.x);
	await expect(nickname).toHaveCSS('text-overflow', 'ellipsis');
	await sidebar.getByRole('button', { name: '로그아웃' }).click();
	await expect(sidebar.getByRole('button', { name: '로그인' })).toBeVisible();
	await expect(team).not.toBeAttached();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.getByRole('navigation', { name: '모바일 주요 메뉴' })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	expect(errors).toEqual([]);
});

async function expectStationarySidebarIcons(page: Page) {
	const selector =
		'aside svg, aside header img, aside nav[aria-label="내 팀"] a > span:first-child, aside footer a > span:first-child, aside a[aria-label="팀 만들기"] > span:first-child';
	for (const x of [30, 600]) {
		const frames = page.evaluate(async (targetSelector) => {
			const elements = [...document.querySelectorAll(targetSelector)];
			const samples: number[][] = [];
			const start = performance.now();
			while (performance.now() - start < 450) {
				samples.push(
					elements.flatMap((element) => {
						const rect = element.getBoundingClientRect();
						return [rect.x, rect.y];
					}),
				);
				await new Promise(requestAnimationFrame);
			}
			return samples;
		}, selector);
		await page.mouse.move(x, 90);
		const samples = await frames;
		expect(samples.length).toBeGreaterThan(2);
		for (let index = 0; index < samples[0].length; index++) {
			const positions = samples.map((sample) => sample[index]);
			expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(0.5);
		}
	}
}

test('펼침과 접힘 애니메이션 동안 메뉴와 푸터 아이콘의 위치를 유지한다', async ({ page }) => {
	await openFeed(page);
	await expectStationarySidebarIcons(page);
});
