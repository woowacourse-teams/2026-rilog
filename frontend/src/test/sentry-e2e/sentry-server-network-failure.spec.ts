import { expect, test } from '@playwright/test';

test('서버 Sentry 전송 연결이 끊겨도 오류 화면과 다음 요청을 처리한다', async ({ page, request }) => {
	// 수신 fixture에는 Node SDK의 전송만 도달하도록 브라우저 요청을 차단한다.
	await page.route('http://127.0.0.1:3108/**', (route) => route.abort('failed'));
	await page.route('**/v1/**', (route) => route.abort('failed'));

	for (const postId of [1, 2]) {
		const postPath = `/@sentry-server-e2e/posts/${postId}`;
		await page.goto(postPath);
		await expect(page.getByRole('heading', { name: '게시글을 불러오지 못했어요.' })).toBeVisible();
		await expect
			.poll(async () => {
				const state = await request.get('http://127.0.0.1:3108/state');
				expect(state.ok()).toBe(true);
				return state.text();
			})
			.toContain(postPath);

		await page.getByRole('link', { name: '피드로 돌아가기' }).click();
		await expect(page).toHaveURL('/feeds');
		const response = await page.goto('/about');
		expect(response?.status()).toBe(200);
		await expect(page.getByRole('main')).toBeVisible();
	}
});
