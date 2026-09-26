import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.route('**/v1/**', (route) => route.abort('failed'));
	await page.route(
		(url) => url.pathname === '/monitoring',
		(route) => route.abort('failed'),
	);
});

test('Sentry 전송이 차단돼도 게시글 오류 화면에서 재시도와 피드 이동이 가능하다', async ({ page }) => {
	const failedEvent = page.waitForEvent('requestfailed', {
		predicate: (request) =>
			new URL(request.url()).pathname === '/monitoring' && Boolean(request.postData()?.includes('"exception"')),
	});

	await page.goto('/@sentry-e2e/posts/1');
	await expect(page.getByRole('heading', { name: '게시글을 불러오지 못했어요.' })).toBeVisible();
	expect((await failedEvent).failure()?.errorText).toContain('ERR_FAILED');

	const retry = page.getByRole('button', { name: '다시 시도' });
	await retry.focus();
	await expect(retry).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(retry).toBeVisible();
	await page.getByRole('link', { name: '피드로 돌아가기' }).click();
	await expect(page).toHaveURL('/feeds');
	await expect(page.getByRole('heading', { name: 'Rilog', exact: true })).toBeAttached();
});

test('처리되지 않은 Promise 오류 전송이 차단돼도 피드를 다시 조회할 수 있다', async ({ page }) => {
	await page.goto('/feeds');
	await page.getByRole('button', { name: '이 업데이트 다시 보지 않기' }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	const retry = page.getByRole('button', { name: '다시 시도', exact: true });
	await expect(retry).toBeVisible();
	const failedEvent = page.waitForEvent('requestfailed', {
		predicate: (request) =>
			new URL(request.url()).pathname === '/monitoring' &&
			Boolean(request.postData()?.includes('sentry-network-failure-test')),
	});

	await page.evaluate(() => {
		setTimeout(() => {
			void Promise.reject(new Error('sentry-network-failure-test'));
		}, 0);
	});
	expect((await failedEvent).failure()?.errorText).toContain('ERR_FAILED');

	await page.route('**/v1/feeds/posts?*', (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: 'E2E fixture',
				data: { posts: [], page: 0, size: 12, numberOfElements: 0, hasNext: false },
			}),
		}),
	);
	await retry.focus();
	await expect(retry).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.getByText('아직 발행된 게시글이 없어요.', { exact: true })).toBeVisible();
	await expect(retry).not.toBeAttached();
});
