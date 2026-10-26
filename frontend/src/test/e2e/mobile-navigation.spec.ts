import { expect, test } from '@playwright/test';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

test('실제 모바일 헤더에서 내 블로그 메뉴와 알림을 보고 로그아웃한다', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));
	await page.route('**/v1/**', (route) => route.abort());
	await mockAuthenticatedAccess(page);
	await page.route('**/v1/posts/101/comment-anchors{,/sidebar}', (route) =>
		route.fulfill({
			json: {
				status: 200,
				message: 'OK',
				data: route.request().url().endsWith('/sidebar') ? { anchorGroups: [] } : { blocks: [] },
			},
		}),
	);
	await page.route('**/v1/notifications/unread-count', (route) =>
		route.fulfill({ json: { status: 200, message: 'OK', data: { unreadCount: 3 } } }),
	);
	await page.route('**/v1/posts/count', (route) =>
		route.fulfill({ json: { status: 200, message: 'OK', data: { totalPostsCount: 3 } } }),
	);
	await page.route('**/v1/posts/101/views', (route) => route.fulfill({ status: 204 }));
	await page.route('**/v1/auth/logout', (route) => route.fulfill({ status: 204 }));
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/@the_rilog/posts/101');
	await expect(page.getByRole('heading', { level: 1, name: '기업 기사' })).toBeVisible();
	await expect(page.getByRole('link', { name: '알림, 읽지 않은 알림 3개', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '프로필 메뉴', exact: true }).click();
	await expect(page.getByRole('menuitem', { name: '내 블로그' })).toHaveAttribute('href', '/@e2e-user');
	await expect(page.getByRole('menuitem', { name: '로그아웃' })).toBeVisible();
	await page.keyboard.press('Escape');
	await page.setViewportSize({ width: 1440, height: 1000 });
	await expect(page.getByRole('link', { name: '알림, 읽지 않은 알림 3개', exact: true })).toBeVisible();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole('button', { name: '프로필 메뉴', exact: true }).click();
	await page.getByRole('menuitem', { name: '로그아웃' }).click();
	await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '프로필 메뉴', exact: true })).toHaveCount(0);
	expect(pageErrors).toEqual([]);
});
