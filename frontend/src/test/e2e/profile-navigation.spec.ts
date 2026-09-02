import { expect, test } from '@playwright/test';

import { mockCologSettingsAccess } from './fixtures/colog-settings-access';

test('모바일 내 avatar와 공개 멤버 avatar에서 개인 블로그로 이동할 수 있다', async ({ page }) => {
	await mockCologSettingsAccess(page);
	await page.route('**/v1/users/me/cologs/overview', (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ status: 200, message: 'OK', data: [] }),
		}),
	);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/@rilog-e2e');

	const mobileNavigation = page.getByRole('navigation', { name: '모바일 주요 메뉴' });
	const myBlogLink = mobileNavigation.getByRole('link', { name: '@e2e-user 블로그로 이동' });
	await expect(myBlogLink).toHaveAttribute('href', '/@e2e-user');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

	await page.setViewportSize({ width: 1280, height: 900 });
	const memberSection = page.getByRole('region', { name: 'Members' });
	const memberBlogLink = memberSection.getByRole('link', { name: '@e2e-user 블로그로 이동' });
	await expect(memberBlogLink).toHaveAttribute('href', '/@e2e-user');
	await expect(memberBlogLink).toBeVisible();
});
