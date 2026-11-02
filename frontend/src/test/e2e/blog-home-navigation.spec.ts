import { expect, test } from '@playwright/test';

import { createNavigationPosts } from '../../../test-harness/blog-home-navigation-fixture';

for (const [slug, parameter, navigationName] of [
	['navigation_personal', 'series', '시리즈와 Colog 탐색'],
	['navigation_team', 'chapter', '챕터 탐색'],
]) {
	test(`${parameter}: 첫 선택은 서버 탐색을 기다리지 않고 반영되며 history를 복원한다`, async ({ page }) => {
		await page.setViewportSize({ width: 1600, height: 1000 });
		let releasePosts = () => {};
		const firstPostsGate = new Promise<void>((resolve) => {
			releasePosts = resolve;
		});
		const unexpectedRequests: string[] = [];
		await page.route('https://api.rilog.test/**', async (route) => {
			const url = new URL(route.request().url());
			if (url.pathname === `/v1/blogs/${slug}/posts`) {
				if (url.searchParams.get('chapterId') === '3') await firstPostsGate;
				await route.fulfill({
					json: { status: 200, message: 'OK', data: createNavigationPosts(slug, url.searchParams.get('chapterId')) },
				});
			} else if (url.pathname === '/v1/posts/count') {
				await route.fulfill({ json: { status: 200, message: 'OK', data: { totalPostsCount: 2 } } });
			} else if (url.pathname.startsWith('/v1/auth/') || url.pathname === `/v1/cologs/${slug}/members`) {
				await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
			} else {
				unexpectedRequests.push(url.pathname);
				await route.abort();
			}
		});
		await page.goto(`/@${slug}`);
		const navigation = page.getByRole('navigation', { name: navigationName }).first();
		await expect(navigation.getByRole('link', { name: '전체, 글 2개' })).toHaveAttribute('aria-current', 'page');
		let releaseNavigation = () => {};
		const navigationGate = new Promise<void>((resolve) => {
			releaseNavigation = resolve;
		});
		// A loaded index selection must not depend on another server-rendered response.
		await page.route(`**/@${slug}?**`, async (route) => {
			if (route.request().headers()['rsc'] === '1') {
				await navigationGate;
				await route.continue();
			} else await route.continue();
		});
		try {
			const request = page.waitForRequest((entry) => {
				const url = new URL(entry.url());
				return url.pathname === `/v1/blogs/${slug}/posts` && url.searchParams.get('chapterId') === '3';
			});
			await navigation.getByRole('link', { name: '첫 번째, 글 1개' }).click();
			await request;
			await expect(page).toHaveURL(new RegExp(`${parameter}=3`));
			await expect(navigation.getByRole('link', { name: '첫 번째, 글 1개' })).toHaveAttribute('aria-current', 'page');
			await navigation.getByRole('link', { name: '두 번째, 글 1개' }).click();
			await expect(page).toHaveURL(new RegExp(`${parameter}=4`));
			await expect(page.getByRole('heading', { name: '두 번째 글', exact: true })).toBeVisible();
			const firstResponse = page.waitForResponse(
				(response) => new URL(response.url()).searchParams.get('chapterId') === '3',
			);
			releasePosts();
			await firstResponse;
			await expect(page.getByRole('heading', { name: '첫 번째 글', exact: true })).toHaveCount(0);
			await navigation.getByRole('link', { name: '전체, 글 2개' }).click();
			await expect(page).toHaveURL(`/@${slug}`);
			await page.goBack();
			await expect(page).toHaveURL(new RegExp(`${parameter}=4`));
			await expect(page.getByRole('heading', { name: '두 번째 글', exact: true })).toBeVisible();
			await expect(navigation.getByRole('link', { name: '두 번째, 글 1개' })).toHaveAttribute('aria-current', 'page');
			await page.goForward();
			await expect(navigation.getByRole('link', { name: '전체, 글 2개' })).toHaveAttribute('aria-current', 'page');
			expect(unexpectedRequests).toEqual([]);
		} finally {
			releasePosts();
			releaseNavigation();
		}
	});
}
