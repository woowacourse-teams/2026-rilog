import { devices, expect, test } from '@playwright/test';

import type { Page, Route } from '@playwright/test';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';
import { REQUIRED_E2E_FLOW_TAGS } from './required-flows';

const TEST_IMAGE_BYTES = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
	'base64',
);
const IPHONE_13 = {
	deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
	hasTouch: devices['iPhone 13'].hasTouch,
	isMobile: devices['iPhone 13'].isMobile,
	userAgent: devices['iPhone 13'].userAgent,
	viewport: devices['iPhone 13'].viewport,
};

const respond = (route: Route, data: unknown) =>
	route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ status: 200, message: 'E2E fixture', data }),
	});

const enableWriteAccess = async (page: Page) => {
	await page.route('**/v1/**', (route) => route.abort('failed'));
	await mockAuthenticatedAccess(page);
	await page.route('**/v1/posts/count', (route) => respond(route, { totalPostsCount: 0 }));
	await page.route('**/v1/drafts/me?*', (route) =>
		respond(route, { drafts: [], page: 0, size: 10, numberOfElements: 0, hasNext: false }),
	);
	await page.route('**/v1/users/me/cologs/overview', (route) => respond(route, []));
	await page.route('**/v1/uploads/presigned-url', (route) =>
		respond(route, {
			uploadId: 'e2e-upload-id',
			objectKey: 'rilog/images/originals/e2e-upload.png',
			uploadUrl: 'http://localhost:3000/e2e-upload',
			headers: {},
			expiresAt: '2026-08-28T00:00:00Z',
		}),
	);
	await page.route('**/e2e-upload', (route) => route.fulfill({ status: 200 }));
};

test.describe('글 작성 브라우저 흐름', () => {
	test.beforeEach(async ({ page }) => {
		await enableWriteAccess(page);
	});

	test(
		'뒤로가기를 취소하면 작성 내용을 유지하고 확인하면 이전 페이지로 이동한다',
		{
			tag: REQUIRED_E2E_FLOW_TAGS.writeHistory,
		},
		async ({ page }) => {
			await page.goto('/about');
			await page.goto('/write');
			const title = page.getByRole('textbox', { name: '게시글 제목' });
			await title.fill('뒤로 가기 보호');

			await page.goBack();
			const confirmDialog = page.getByRole('dialog', { name: '작성 중인 글을 나갈까요?' });
			await expect(confirmDialog).toBeVisible();
			await confirmDialog.getByRole('button', { name: '계속 작성' }).click();
			await expect(page).toHaveURL('/write');
			await expect(title).toHaveValue('뒤로 가기 보호');

			await page.goBack();
			await confirmDialog.getByRole('button', { name: '나가기' }).click();
			await expect(page).toHaveURL('/about');
		},
	);

	test('새로고침을 취소하면 작성 내용을 유지한다', { tag: REQUIRED_E2E_FLOW_TAGS.writeReload }, async ({ page }) => {
		await page.goto('/write');
		const title = page.getByRole('textbox', { name: '게시글 제목' });
		await title.fill('새로고침 보호');
		const dialogPromise = page.waitForEvent('dialog');
		void page.reload().catch(() => undefined);
		const dialog = await dialogPromise;

		expect(dialog.type()).toBe('beforeunload');
		await dialog.dismiss();
		await expect(page).toHaveURL('/write');
		await expect(title).toHaveValue('새로고침 보호');
	});

	test(
		'파일 선택으로 업로드한 이미지를 편집기에 표시한다',
		{
			tag: REQUIRED_E2E_FLOW_TAGS.writeFileUpload,
		},
		async ({ page }) => {
			await page.goto('/write');
			const editor = page.getByRole('textbox', { name: '게시글 내용' });
			await editor.click();
			await page.keyboard.type('/이미지');
			await page.keyboard.press('Enter');

			await page.getByRole('tabpanel', { name: '업로드' }).locator('input[type="file"]').setInputFiles({
				name: 'selected.png',
				mimeType: 'image/png',
				buffer: TEST_IMAGE_BYTES,
			});

			await expect(page.locator('[data-content-type="image"] img')).toHaveAttribute('src', /e2e-upload\.png$/);
		},
	);
});

test.describe('모바일 글쓰기 정책', () => {
	test.use(IPHONE_13);

	test(
		'모바일 기기에서는 편집기 대신 PC 이용 안내를 제공한다',
		{
			tag: REQUIRED_E2E_FLOW_TAGS.mobileWritePolicy,
		},
		async ({ page }) => {
			await enableWriteAccess(page);
			await page.goto('/write');

			await expect(page.getByRole('heading', { name: '글 작성은 PC에서 이용해 주세요' })).toBeVisible();
			await expect(page.getByRole('link', { name: '피드로 돌아가기' })).toHaveAttribute('href', '/feeds');
			await expect(page.getByRole('textbox', { name: '게시글 내용' })).not.toBeAttached();
			await expect(page.locator('.bn-editor')).not.toBeAttached();
		},
	);
});
