import { expect, test } from '@playwright/test';

// Only a real Next server/browser proves that the SSG magazine, SSR post body,
// encoded fragment, router history, and post heading IDs agree. Existing required
// writing fixtures cannot exercise this navigation; their four tags stay intact.
test.beforeEach(async ({ page }) => {
	await page.route('https://api.rilog.test/**', async (route) => {
		const pathname = new URL(route.request().url()).pathname;
		if (pathname.endsWith('/comment-anchors/sidebar')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { anchorGroups: [] } } });
		} else if (pathname.endsWith('/comment-anchors')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { blocks: [] } } });
		} else if (pathname.endsWith('/history')) {
			await route.fulfill({ status: 204 });
		} else {
			await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
		}
	});
});

test('정적 매거진은 API를 다시 읽지 않고 헤드라인을 해당 본문 위치로 연결한다', async ({ page, request }) => {
	// The existing post layout exposes its TOC only for a sufficiently wide card.
	await page.setViewportSize({ width: 1400, height: 900 });
	const mainRequests: string[] = [];
	const hydrationErrors: string[] = [];
	page.on('request', (entry) => {
		if (entry.url().includes('/v1/the-rilog')) mainRequests.push(entry.url());
	});
	page.on('console', (message) => {
		if (/hydration|did not match/i.test(message.text())) hydrationErrors.push(message.text());
	});
	const response = await request.get('/the-rilog');
	expect(response.ok()).toBe(true);
	const html = await response.text();
	expect(html).toContain('웹 플랫폼 업데이트');
	expect(html).toContain('/@the_rilog/posts/100#');
	await page.goto('/the-rilog');
	await expect(page.getByLabel('오늘 날짜').locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
	const headline = page.getByRole('link', { name: '웹 플랫폼 업데이트', exact: true });
	const href = await headline.getAttribute('href');
	expect(href).toBe('/@the_rilog/posts/100#%EC%9B%B9-%ED%94%8C%EB%9E%AB%ED%8F%BC-%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8');
	await headline.hover();
	await headline.click();
	await expect(page).toHaveURL(/\/@the_rilog\/posts\/100#/);
	await expect(page.getByRole('heading', { level: 1, name: 'Daily Headlines' })).toBeVisible();
	const target = page.locator('[id="웹-플랫폼-업데이트"]');
	await expect(target).toBeInViewport();
	await expect(page.getByRole('navigation', { name: '게시글 목차' })).toBeVisible();
	await expect(page.getByRole('button', { name: /전체 댓글 0개 보기/ }).first()).toBeAttached();
	await page.goBack();
	await expect(page).toHaveURL(/\/the-rilog$/);
	await page.reload();
	expect(mainRequests).toEqual([]);
	expect(hydrationErrors).toEqual([]);
	if (href === null) throw new Error('헤드라인의 실제 목적지가 필요합니다.');
	await page.goto(href);
	await expect(target).toBeInViewport();
});

test('기사별 상세 목적지와 설명·출처를 유지하고 모바일 키보드로 접근할 수 있다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/the-rilog');
	const enterprise = page.getByRole('link', { name: '기업 기사', exact: true });
	await expect(enterprise).toHaveAttribute('href', '/@the_rilog/posts/101');
	await expect(page.getByRole('link', { name: '개인 기사', exact: true })).toHaveAttribute(
		'href',
		'/@the_rilog/posts/102',
	);
	await enterprise.focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/@the_rilog\/posts\/101$/);
	await expect(page.getByRole('heading', { level: 1, name: '기업 기사' })).toBeVisible();
	await expect(page.getByText('기업 기사 요약', { exact: true })).toBeVisible();
	await expect(page.getByText('테스트 기업', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '게시글 수정' })).toHaveCount(0);
});
