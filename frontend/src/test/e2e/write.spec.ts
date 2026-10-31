import { devices, expect, test } from '@playwright/test';

import type { Page, Route } from '@playwright/test';

import { RELEASE_NOTE_STORAGE_KEY } from '@/features/release-notes/model/release-note-storage';
import { getLatestReleaseNote, RELEASE_NOTES } from '@/features/release-notes/model/release-notes';

import { AUTH_REFRESH_ROUTE, mockAuthenticatedAccess } from './fixtures/authenticated-access';
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
			uploadUrl: new URL('/e2e-upload', page.url()).href,
			headers: {},
			expiresAt: '2026-08-28T00:00:00Z',
		}),
	);
	await page.route('**/e2e-upload', (route) => route.fulfill({ status: 200 }));
};

const prepareGuestWriteLogin = async (page: Page) => {
	const latestReleaseNote = getLatestReleaseNote(RELEASE_NOTES);
	if (latestReleaseNote) {
		await page.addInitScript(({ key, id }) => localStorage.setItem(key, id), {
			key: RELEASE_NOTE_STORAGE_KEY,
			id: latestReleaseNote.id,
		});
	}
	await page.route('**/v1/**', (route) => route.abort('failed'));
	await page.route(AUTH_REFRESH_ROUTE, (route) => route.fulfill({ status: 401 }));
	const guestRefresh = page.waitForResponse((response) => response.url().endsWith('/v1/auth/token/refresh'));
	await page.goto('/the-rilog');
	await guestRefresh;
	await page.getByRole('link', { name: '글쓰기' }).click();
	await expect(page.getByRole('dialog', { name: '로그인' })).toBeVisible();
	await expect(page).toHaveURL('/the-rilog');

	const appOrigin = new URL(page.url()).origin;
	await enableWriteAccess(page);
	let hasCompletedOAuth = false;
	await page.route(AUTH_REFRESH_ROUTE, (route) =>
		hasCompletedOAuth ? route.fallback() : route.fulfill({ status: 401 }),
	);
	await page.route(
		(url) => url.pathname === '/v1/auth/github',
		(route) => route.fulfill({ status: 302, headers: { Location: `${appOrigin}/auth/github/callback?code=e2e-code` } }),
	);
	return {
		completeOAuth: () => {
			hasCompletedOAuth = true;
		},
	};
};

test('접힌 사이드바의 글쓰기 링크에 키보드 포커스가 오면 문구가 보인다', async ({ page }) => {
	await page.route(AUTH_REFRESH_ROUTE, (route) => route.fulfill({ status: 401 }));
	await page.goto('/the-rilog');
	const writeLink = page.getByRole('link', { name: '글쓰기' });
	const writeLabel = writeLink.getByText('글쓰기');
	const sidebar = page.getByRole('complementary', { name: '사이드바' });
	await page.mouse.move(500, 300);
	await expect(writeLink).toBeVisible();
	await expect.poll(() => writeLabel.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');

	const logoLink = page.getByRole('link', { name: /메인으로 이동/ });
	await logoLink.focus();
	for (
		let attempt = 0;
		attempt < 20 && !(await writeLink.evaluate((element) => element === document.activeElement));
		attempt += 1
	) {
		await page.keyboard.press('Tab');
	}
	await expect(writeLink).toBeFocused();
	await page.mouse.move(500, 300);
	await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeGreaterThan(150);
	await expect.poll(() => writeLabel.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
});

test('사이드바 링크를 클릭하면 포인터가 벗어난 뒤 접힌 상태로 돌아간다', async ({ page }) => {
	await page.route(AUTH_REFRESH_ROUTE, (route) => route.fulfill({ status: 401 }));
	await page.goto('/the-rilog');
	const sidebar = page.getByRole('complementary', { name: '사이드바' });
	const logoLink = page.getByRole('link', { name: /메인으로 이동/ });
	const writeLabel = page.getByRole('link', { name: '글쓰기' }).getByText('글쓰기');

	await logoLink.click();
	await expect(page).toHaveURL('/feeds');
	await page.mouse.move(500, 300);
	await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeLessThan(100);
	await expect.poll(() => writeLabel.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');
});

test('비회원이 글쓰기를 누르고 로그인하면 원래 페이지를 거쳐 글쓰기 화면으로 이동한다', async ({ page }) => {
	const { completeOAuth } = await prepareGuestWriteLogin(page);
	await page.route('**/v1/auth/github/callback', (route) => {
		completeOAuth();
		return route.fulfill({
			contentType: 'application/json',
			headers: {
				Authorization: 'Bearer e2e-access-token',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Origin': new URL(page.url()).origin,
				'Access-Control-Expose-Headers': 'Authorization',
			},
			body: JSON.stringify({ status: 200, message: 'OK', data: { onboardingStatus: 'COMPLETED', redirectUrl: '/' } }),
		});
	});
	await page.getByRole('button', { name: 'GitHub로 계속하기' }).click();

	await expect(page).toHaveURL('/write');
	await page.goBack();
	await expect(page).toHaveURL('/the-rilog');
});

test('글쓰기 로그인 콜백이 실패하면 글쓰기 화면으로 이동하지 않는다', async ({ page }) => {
	await prepareGuestWriteLogin(page);
	await page.route('**/v1/auth/github/callback', (route) => route.fulfill({ status: 500 }));
	await page.getByRole('button', { name: 'GitHub로 계속하기' }).click();

	await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
	await expect(page).toHaveURL('/feeds');
});

test.describe('글 작성 브라우저 흐름', () => {
	test.beforeEach(async ({ page }) => {
		await enableWriteAccess(page);
	});

	test('독립 이미지 블록을 다른 이미지 아래로 드래그해 세로 순서를 바꾼다', async ({ page }) => {
		await page.route('**/rilog/images/originals/e2e-upload.png', (route) =>
			route.fulfill({
				contentType: 'image/svg+xml',
				body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#ddd"/></svg>',
			}),
		);
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 내용' }).click();
		await page.keyboard.type('/이미지');
		await page.keyboard.press('Enter');
		await page
			.getByRole('tabpanel', { name: '업로드' })
			.locator('input[type="file"]')
			.setInputFiles([
				{ name: 'first.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
				{ name: 'second.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
			]);
		const images = page.locator('.post-write-blocknote [data-content-type="image"] img');
		await expect(images).toHaveCount(2);
		await expect.poll(() => images.nth(1).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(320);
		const targetBounds = await images.nth(1).boundingBox();
		expect(targetBounds).not.toBeNull();
		if (!targetBounds) return;
		await images.first().dragTo(images.nth(1), {
			targetPosition: { x: targetBounds.width / 2, y: targetBounds.height * 0.75 },
		});
		await expect(page.locator('.post-write-blocknote .bn-block-column-list')).toHaveCount(0);
		await expect(images.first()).toHaveAttribute('alt', 'second.png');
		await expect(images.nth(1)).toHaveAttribute('alt', 'first.png');
	});

	test('업로드한 이미지 두 장을 행으로 묶고 순서를 바꾼 뒤 꺼낼 수 있다', async ({ page }) => {
		await page.route('**/rilog/images/originals/e2e-upload.png', (route) =>
			route.fulfill({
				contentType: 'image/svg+xml',
				body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#ddd"/></svg>',
			}),
		);
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 내용' }).click();
		await page.keyboard.type('/이미지');
		await page.keyboard.press('Enter');
		await page
			.getByRole('tabpanel', { name: '업로드' })
			.locator('input[type="file"]')
			.setInputFiles([
				{ name: 'first.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
				{ name: 'second.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
			]);

		const images = page.locator('.post-write-blocknote [data-content-type="image"] img');
		await expect(images).toHaveCount(2);
		await expect.poll(() => images.first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(320);
		const editorBounds = await page.locator('.post-write-blocknote .bn-editor').boundingBox();
		const targetBounds = await images.nth(1).boundingBox();
		expect(editorBounds).not.toBeNull();
		expect(targetBounds).not.toBeNull();
		if (!editorBounds || !targetBounds) return;
		expect(targetBounds.x - editorBounds.x).toBeLessThanOrEqual(48);
		const outsideX = editorBounds.x - 100;
		const targetY = targetBounds.y + targetBounds.height / 2;
		await images
			.first()
			.evaluate((source) =>
				source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: new DataTransfer() })),
			);
		const canDropBesideImage = await page.evaluate(
			({ x, y }) => {
				const event = new DragEvent('dragover', {
					bubbles: true,
					cancelable: true,
					clientX: x,
					clientY: y,
					dataTransfer: new DataTransfer(),
				});
				document.body.dispatchEvent(event);
				return event.defaultPrevented;
			},
			{ x: outsideX, y: targetY },
		);
		expect(canDropBesideImage).toBe(true);
		const guide = page.locator('.post-write-image-row-guide');
		await expect(guide).toBeVisible();
		const guideBounds = await guide.boundingBox();
		expect(guideBounds).not.toBeNull();
		expect(guideBounds?.x).toBeCloseTo(targetBounds.x - 16 - 2.5);
		expect(guideBounds?.y).toBeCloseTo(targetBounds.y);
		expect(guideBounds?.height).toBeCloseTo(targetBounds.height);
		await expect
			.poll(() => guide.evaluate((element) => getComputedStyle(element).backgroundColor))
			.toBe('rgb(221, 238, 255)');
		await expect.poll(() => guide.evaluate((element) => getComputedStyle(element).width)).toBe('5px');
		await expect(guide).toHaveCSS('pointer-events', 'none');
		const rightWhitespaceX = editorBounds.x + editorBounds.width - 1;
		expect(rightWhitespaceX - (targetBounds.x + targetBounds.width)).toBeGreaterThan(48);
		await page.evaluate(
			({ x, y }) =>
				document.body.dispatchEvent(
					new DragEvent('dragover', {
						bubbles: true,
						cancelable: true,
						clientX: x,
						clientY: y,
						dataTransfer: new DataTransfer(),
					}),
				),
			{ x: rightWhitespaceX, y: targetY },
		);
		await expect(guide).toBeVisible();
		const rightGuideBounds = await guide.boundingBox();
		expect(rightGuideBounds?.x).toBeCloseTo(targetBounds.x + targetBounds.width + 16 - 2.5);
		await page.keyboard.press('Escape');
		await expect(guide).toBeHidden();
		await images.first().dragTo(page.locator('body'), { targetPosition: { x: outsideX, y: targetY } });

		const row = page.locator('.post-write-blocknote .bn-block-column-list');
		await expect(row).toHaveCount(1);
		await expect(row.locator('.bn-block-column')).toHaveCount(2);
		await expect(row.locator('[data-content-type="image"] img')).toHaveCount(2);
		await expect(row.locator('img').first()).toHaveAttribute('alt', 'first.png');
		const rowImages = row.locator('img');
		const secondBounds = await rowImages.nth(1).boundingBox();
		expect(secondBounds).not.toBeNull();
		if (!secondBounds) return;
		await rowImages
			.first()
			.evaluate((source) =>
				source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: new DataTransfer() })),
			);
		await page.evaluate(
			({ x, y }) =>
				document.body.dispatchEvent(
					new DragEvent('dragover', {
						bubbles: true,
						cancelable: true,
						clientX: x,
						clientY: y,
						dataTransfer: new DataTransfer(),
					}),
				),
			{ x: secondBounds.x + secondBounds.width - 1, y: secondBounds.y + secondBounds.height / 2 },
		);
		await expect(guide).toBeVisible();
		await page.keyboard.press('Escape');
		await rowImages.first().dragTo(rowImages.nth(1), {
			targetPosition: { x: secondBounds.width - 1, y: secondBounds.height / 2 },
		});
		await expect(rowImages.first()).toHaveAttribute('alt', 'second.png');
		await expect(rowImages.nth(1)).toHaveAttribute('alt', 'first.png');

		const paragraph = page.locator('.post-write-blocknote .bn-block-content[data-content-type="paragraph"]').first();
		await expect(paragraph).toBeVisible();
		const paragraphBounds = await paragraph.boundingBox();
		expect(paragraphBounds).not.toBeNull();
		if (!paragraphBounds) return;
		await rowImages
			.first()
			.evaluate((source) =>
				source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: new DataTransfer() })),
			);
		await page.evaluate(
			({ x, y }) =>
				document.body.dispatchEvent(
					new DragEvent('dragover', {
						bubbles: true,
						cancelable: true,
						clientX: x,
						clientY: y,
						dataTransfer: new DataTransfer(),
					}),
				),
			{ x: paragraphBounds.x + paragraphBounds.width / 2, y: paragraphBounds.y + paragraphBounds.height / 2 },
		);
		await expect(page.locator('.post-write-image-row-detach-guide')).toBeVisible();
		await page.keyboard.press('Escape');
		await paragraph.click();
		await row.locator('img').first().dragTo(paragraph, { steps: 10 });
		await expect(row).toHaveCount(0);
		await expect(images).toHaveCount(2);
		await expect(images.first()).toHaveAttribute('alt', 'first.png');
		await expect(images.nth(1)).toHaveAttribute('alt', 'second.png');
	});

	// The column resize boundary depends on browser layout and cannot be measured by jsdom.
	test('작은 이미지 행의 두 열 사이에 놓을 때 가이드가 열 조절바에 맞춰진다', async ({ page }) => {
		await page.route('**/rilog/images/originals/e2e-upload.png', (route) =>
			route.fulfill({
				contentType: 'image/svg+xml',
				body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#ddd"/></svg>',
			}),
		);
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 내용' }).click();
		await page.keyboard.type('/이미지');
		await page.keyboard.press('Enter');
		await page
			.getByRole('tabpanel', { name: '업로드' })
			.locator('input[type="file"]')
			.setInputFiles(
				['first.png', 'second.png', 'third.png'].map((name) => ({
					name,
					mimeType: 'image/png',
					buffer: TEST_IMAGE_BYTES,
				})),
			);

		const images = page.locator('.post-write-blocknote [data-content-type="image"] img');
		await expect(images).toHaveCount(3);
		await expect.poll(() => images.nth(1).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(120);
		const editorBounds = await page.locator('.post-write-blocknote .bn-editor').boundingBox();
		const secondBounds = await images.nth(1).boundingBox();
		expect(editorBounds).not.toBeNull();
		expect(secondBounds).not.toBeNull();
		if (!editorBounds || !secondBounds) return;
		await images.first().dragTo(page.locator('body'), {
			targetPosition: { x: editorBounds.x - 100, y: secondBounds.y + secondBounds.height / 2 },
		});

		const row = page.locator('.post-write-blocknote .bn-block-column-list');
		await expect(row.locator('.bn-block-column')).toHaveCount(2);
		const firstColumnBounds = await row.locator('.bn-block-column').first().boundingBox();
		const firstImageBounds = await row.locator('img').first().boundingBox();
		const secondImageBounds = await row.locator('img').nth(1).boundingBox();
		expect(firstColumnBounds).not.toBeNull();
		expect(firstImageBounds).not.toBeNull();
		expect(secondImageBounds).not.toBeNull();
		if (!firstColumnBounds || !firstImageBounds || !secondImageBounds) return;
		const firstColumn = row.locator('.bn-block-column').first();
		const separatorBeforeDrag = await firstColumn.evaluate((element) => {
			element.parentElement?.classList.add('bn-column-list-hovered');
			element.classList.add('bn-column-resize-border');
			return getComputedStyle(element).boxShadow;
		});
		expect(separatorBeforeDrag).not.toBe('none');
		await images
			.nth(2)
			.evaluate((source) =>
				source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: new DataTransfer() })),
			);
		const separatorDuringDrag = await firstColumn.evaluate((element) => {
			element.parentElement?.classList.add('bn-column-list-hovered');
			element.classList.add('bn-column-resize-border');
			return getComputedStyle(element).boxShadow;
		});
		expect(separatorDuringDrag).toBe('none');
		const guide = page.locator('.post-write-image-row-guide');
		for (const edgeX of [firstImageBounds.x + firstImageBounds.width, secondImageBounds.x]) {
			await page.evaluate(
				({ x, y }) =>
					document.body.dispatchEvent(
						new DragEvent('dragover', {
							bubbles: true,
							cancelable: true,
							clientX: x,
							clientY: y,
							dataTransfer: new DataTransfer(),
						}),
					),
				{ x: edgeX, y: secondImageBounds.y + secondImageBounds.height / 2 },
			);
			await expect(guide).toBeVisible();
			const center = await guide.evaluate((element) => Number.parseFloat(element.style.left));
			expect(center).toBeCloseTo(firstColumnBounds.x + firstColumnBounds.width + 2, 0);
		}
		await page.evaluate(
			({ x, y }) =>
				document.body.dispatchEvent(
					new DragEvent('drop', {
						bubbles: true,
						cancelable: true,
						clientX: x,
						clientY: y,
						dataTransfer: new DataTransfer(),
					}),
				),
			{ x: secondImageBounds.x, y: secondImageBounds.y + secondImageBounds.height / 2 },
		);
		await expect(row.locator('img')).toHaveCount(3);
		await expect(row.locator('img').nth(1)).toHaveAttribute('alt', 'third.png');
		await expect(page.locator('.post-write-blocknote .bn-editor')).not.toHaveClass(/post-write-image-row-dragging/);
	});

	for (const { width, height, dropSide } of [
		{ width: 1100, height: 720, dropSide: 'left' },
		{ width: 1440, height: 900, dropSide: 'right' },
	] as const) {
		test(`${width}px 뷰포트에서 이미지 행 바깥 드롭 영역과 가이드 위치를 확인한다`, async ({ page }) => {
			await page.setViewportSize({ width, height });
			await page.route('**/rilog/images/originals/e2e-upload.png', (route) =>
				route.fulfill({
					contentType: 'image/svg+xml',
					body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#ddd"/></svg>',
				}),
			);
			await page.goto('/write');
			await page.getByRole('textbox', { name: '게시글 내용' }).click();
			await page.keyboard.type('/이미지');
			await page.keyboard.press('Enter');
			await page
				.getByRole('tabpanel', { name: '업로드' })
				.locator('input[type="file"]')
				.setInputFiles(
					['first.png', 'second.png', 'third.png'].map((name) => ({
						name,
						mimeType: 'image/png',
						buffer: TEST_IMAGE_BYTES,
					})),
				);
			const images = page.locator('.post-write-blocknote [data-content-type="image"] img');
			await expect(images).toHaveCount(3);
			await expect.poll(() => images.nth(1).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(120);
			const editor = page.locator('.post-write-blocknote .bn-editor');
			const editorBounds = await editor.boundingBox();
			const secondBounds = await images.nth(1).boundingBox();
			expect(editorBounds).not.toBeNull();
			expect(secondBounds).not.toBeNull();
			if (!editorBounds || !secondBounds) return;
			await images.first().dragTo(page.locator('body'), {
				targetPosition: { x: editorBounds.x - 100, y: secondBounds.y + secondBounds.height / 2 },
			});

			const row = page.locator('.post-write-blocknote .bn-block-column-list');
			await expect(row.locator('.bn-block-column')).toHaveCount(2);
			const guide = page.locator('.post-write-image-row-guide');
			await images
				.nth(2)
				.evaluate((source) =>
					source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: new DataTransfer() })),
				);
			const refreshedEditorBounds = await editor.boundingBox();
			expect(refreshedEditorBounds).not.toBeNull();
			if (!refreshedEditorBounds) return;
			for (const side of ['left', 'right'] as const) {
				const column =
					side === 'left' ? row.locator('.bn-block-column').first() : row.locator('.bn-block-column').last();
				const targetImage = column.locator('img');
				const columnBounds = await column.boundingBox();
				const imageBounds = await targetImage.boundingBox();
				expect(columnBounds).not.toBeNull();
				expect(imageBounds).not.toBeNull();
				if (!columnBounds || !imageBounds) return;
				const edge = side === 'left' ? refreshedEditorBounds.x : refreshedEditorBounds.x + refreshedEditorBounds.width;
				const direction = side === 'left' ? -1 : 1;
				const pointerY = imageBounds.y + imageBounds.height / 2;
				const dragOver = async (pointerX: number) =>
					page.evaluate(
						({ x, y }) => {
							const event = new DragEvent('dragover', {
								bubbles: true,
								cancelable: true,
								clientX: x,
								clientY: y,
								dataTransfer: new DataTransfer(),
							});
							document.body.dispatchEvent(event);
							return event.defaultPrevented;
						},
						{ x: pointerX, y: pointerY },
					);
				expect(await dragOver(edge + direction * 101)).toBe(false);
				await expect(guide).toBeHidden();
				expect(await dragOver(edge + direction * 100)).toBe(true);
				await expect(guide).toBeVisible();
				const guideCenter = await guide.evaluate((element) => Number.parseFloat(element.style.left));
				const columnEdge = side === 'left' ? columnBounds.x : columnBounds.x + columnBounds.width;
				expect(guideCenter).toBeCloseTo(columnEdge + direction * 16, 0);
				const guideBounds = await guide.boundingBox();
				expect(guideBounds?.y).toBeCloseTo(imageBounds.y, 0);
				expect(guideBounds?.height).toBeCloseTo(imageBounds.height, 0);
				await expect(guide).toHaveCSS('pointer-events', 'none');
			}
			const targetImage = dropSide === 'left' ? row.locator('img').first() : row.locator('img').last();
			const targetBounds = await targetImage.boundingBox();
			expect(targetBounds).not.toBeNull();
			if (!targetBounds) return;
			const direction = dropSide === 'left' ? -1 : 1;
			const dropX =
				(dropSide === 'left' ? refreshedEditorBounds.x : refreshedEditorBounds.x + refreshedEditorBounds.width) +
				direction * 100;
			const dropY = targetBounds.y + targetBounds.height / 2;
			await page.evaluate(
				({ x, y }) =>
					document.body.dispatchEvent(
						new DragEvent('dragover', {
							bubbles: true,
							cancelable: true,
							clientX: x,
							clientY: y,
							dataTransfer: new DataTransfer(),
						}),
					),
				{ x: dropX, y: dropY },
			);
			await expect(guide).toBeVisible();
			await page.evaluate(
				({ x, y }) =>
					document.body.dispatchEvent(
						new DragEvent('drop', {
							bubbles: true,
							cancelable: true,
							clientX: x,
							clientY: y,
							dataTransfer: new DataTransfer(),
						}),
					),
				{ x: dropX, y: dropY },
			);
			await expect(row.locator('img')).toHaveCount(3);
			await expect(row.locator('img').nth(dropSide === 'left' ? 0 : 2)).toHaveAttribute('alt', 'third.png');
		});
	}

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

	test('문단 밖으로 수평 드래그해도 위 문단이 선택되지 않는다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('첫째 문단');
		await page.keyboard.press('Enter');
		await page.keyboard.type('둘째 문단 길게 선택');
		await page.keyboard.press('Enter');
		await page.keyboard.type('셋째 문단');

		const secondParagraph = page.locator('.bn-block-content[data-content-type="paragraph"] .bn-inline-content').nth(1);
		const bounds = await secondParagraph.evaluate((element) => {
			const range = document.createRange();
			range.selectNodeContents(element);
			const rect = range.getBoundingClientRect();
			return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
		});
		const editorBounds = await editor.boundingBox();
		const firstBounds = await page
			.locator('.bn-block-content[data-content-type="paragraph"] .bn-inline-content')
			.first()
			.boundingBox();
		const thirdBounds = await page
			.locator('.bn-block-content[data-content-type="paragraph"] .bn-inline-content')
			.nth(2)
			.boundingBox();
		expect(editorBounds).not.toBeNull();
		expect(firstBounds).not.toBeNull();
		expect(thirdBounds).not.toBeNull();
		expect(bounds.x - 80).toBeLessThan(editorBounds?.x ?? 0);
		const y = bounds.y + bounds.height / 2;
		await page.mouse.move(bounds.x + bounds.width - 5, y);
		await page.mouse.down();
		await page.mouse.move(bounds.x - 80, y, { steps: 8 });
		for (const outsideY of [
			(firstBounds?.y ?? 0) + (firstBounds?.height ?? 0) / 2,
			(thirdBounds?.y ?? 0) + (thirdBounds?.height ?? 0) / 2,
		]) {
			await page.mouse.move(bounds.x - 80, outsideY, { steps: 8 });
			await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
			const outsideSelection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
			expect(outsideSelection).toContain('둘째 문단');
			expect(outsideSelection).not.toContain('첫째 문단');
			expect(outsideSelection).not.toContain('셋째 문단');
		}
		await page.mouse.move(bounds.x - 80, y, { steps: 8 });

		const selection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
		expect(selection).toContain('둘째 문단');
		expect(selection).not.toContain('첫째 문단');
		expect(selection).not.toContain('셋째 문단');
		await page.mouse.up();
		await page.evaluate(() => window.getSelection()?.removeAllRanges());

		await page.mouse.move(bounds.x + 5, y);
		await page.mouse.down();
		await page.mouse.move((editorBounds?.x ?? 0) + (editorBounds?.width ?? 0) + 40, y, { steps: 8 });
		const rightSelection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
		expect(rightSelection).toContain('둘째 문단');
		expect(rightSelection).not.toContain('셋째 문단');
		await page.mouse.up();
	});

	test('편집기 안에서 세로로 드래그하면 여러 문단을 선택할 수 있다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('첫째 문단');
		await page.keyboard.press('Enter');
		await page.keyboard.type('둘째 문단 길게 선택');
		await page.keyboard.press('Enter');
		await page.keyboard.type('셋째 문단');

		// 앞선 드래그와 같은 위치에서 연속 입력하면 편집기가 더블클릭으로 처리할 수 있어 독립된 페이지에서 검증한다.
		const paragraphs = page.locator('.bn-block-content[data-content-type="paragraph"] .bn-inline-content');
		const secondBounds = await paragraphs.nth(1).boundingBox();
		const thirdBounds = await paragraphs.nth(2).boundingBox();
		if (secondBounds === null || thirdBounds === null) {
			throw new Error('드래그할 문단의 위치를 찾을 수 없습니다.');
		}
		await page.mouse.move(secondBounds.x + 5, secondBounds.y + secondBounds.height / 2);
		await page.mouse.down();
		await page.mouse.move(thirdBounds.x + 25, thirdBounds.y + thirdBounds.height / 2, { steps: 8 });
		const verticalSelection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
		expect(verticalSelection).toContain('둘째 문단');
		expect(verticalSelection).toContain('셋');
		await page.mouse.up();
	});

	test('코드블록은 최근 언어를 새 글에서도 사용하고 Enter로 줄을 바꾼다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/코드');
		await page.keyboard.press('Enter');

		const firstCodeBlock = page.locator('.post-write-blocknote [data-content-type="codeBlock"]').first();
		await expect(firstCodeBlock.getByRole('button', { name: '코드 언어: Plain Text' })).toBeVisible();
		await page.keyboard.type('const answer = 42;');
		await page.keyboard.press('Enter');
		await page.keyboard.type('answer;');
		await expect(firstCodeBlock.locator('pre code')).toContainText('const answer = 42;\nanswer;');

		await firstCodeBlock.getByRole('button', { name: '코드 언어: Plain Text' }).click();
		await page.getByRole('option', { name: 'TypeScript' }).click();
		await expect(firstCodeBlock).toHaveAttribute('data-language', 'typescript');
		expect(await page.evaluate(() => localStorage.getItem('rilog:recent-code-language'))).toBe('typescript');

		await page.close();
		const nextPage = await page.context().newPage();
		await enableWriteAccess(nextPage);
		await nextPage.goto('/write');
		const nextEditor = nextPage.getByRole('textbox', { name: '게시글 내용' });
		await nextEditor.click();
		await nextPage.keyboard.type('/코드');
		await nextPage.keyboard.press('Enter');
		await expect(nextPage.locator('.post-write-blocknote [data-content-type="codeBlock"]').first()).toHaveAttribute(
			'data-language',
			'typescript',
		);
	});

	test('첫 코드블록을 JavaScript로 만들면 하이라이팅과 Enter가 함께 작동한다', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('rilog:recent-code-language', 'javascript'));
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/코드');
		await page.keyboard.press('Enter');

		const codeBlock = page.locator('.post-write-blocknote [data-content-type="codeBlock"]').first();
		await expect(codeBlock).toHaveAttribute('data-language', 'javascript');
		const code = codeBlock.locator('pre code');
		await page.keyboard.type('const answer = 42;');
		await expect(code.locator('.shiki').first()).toBeVisible();
		await page.keyboard.press('Enter');
		await page.keyboard.type('answer;');
		await expect(code).toContainText('const answer = 42;\nanswer;');
		await page.keyboard.press('ControlOrMeta+z');
		await expect(code).not.toContainText('answer;');
		await page.keyboard.press('ControlOrMeta+Shift+z');
		await expect(code).toContainText('const answer = 42;\nanswer;');
	});

	test('JavaScript 코드블록에서 한글을 지운 뒤 영어 코드를 입력하면 하이라이팅한다', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('rilog:recent-code-language', 'javascript'));
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/코드');
		await page.keyboard.press('Enter');

		const block = page.locator('.post-write-blocknote [data-content-type="codeBlock"]').first();
		await expect(block).toHaveAttribute('data-language', 'javascript');
		const code = block.locator('pre code');
		await page.keyboard.insertText('한글');
		await expect(code).toContainText('한글');
		await page.keyboard.press('Backspace');
		await page.keyboard.press('Backspace');
		await expect(block.locator('pre')).toBeEmpty();
		await expect(code).toBeAttached();
		await page.keyboard.type('const answer = 42;');
		await expect(code).toContainText('const answer = 42;');
		await expect(code.locator('.shiki').first()).toBeVisible();
	});

	test('언어 없는 백틱 코드블록은 최신 저장 언어를 읽고 명시한 언어는 보존한다', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('rilog:recent-code-language', 'python'));
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('``` ');
		const codeBlocks = page.locator('.post-write-blocknote [data-content-type="codeBlock"]');
		await expect(codeBlocks.first()).toHaveAttribute('data-language', 'python');

		await page.keyboard.press('Shift+Enter');
		await page.keyboard.type('```js ');
		await expect(codeBlocks.nth(1)).toHaveAttribute('data-language', 'javascript');
		await page.evaluate(() => localStorage.setItem('rilog:recent-code-language', 'typescript'));
		await page.keyboard.press('Shift+Enter');
		await page.keyboard.type('``` ');
		await expect(codeBlocks.nth(2)).toHaveAttribute('data-language', 'typescript');
	});

	test('백틱으로 만든 코드블록도 최근 JavaScript 언어로 하이라이팅하고 개행한다', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('rilog:recent-code-language', 'javascript'));
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('``` ');

		const codeBlock = page.locator('.post-write-blocknote [data-content-type="codeBlock"]').first();
		await expect(codeBlock).toHaveAttribute('data-language', 'javascript');
		const code = codeBlock.locator('pre code');
		await page.keyboard.type('const answer = 42;');
		await expect(code.locator('.shiki').first()).toBeVisible();
		await page.keyboard.press('Enter');
		await page.keyboard.type('answer;');
		await expect(code).toContainText('const answer = 42;\nanswer;');
	});

	test('마우스로 코드블록을 선택해도 즉시 입력·Enter·하이라이팅이 작동한다', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('rilog:recent-code-language', 'javascript'));
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/코드');
		await page.getByText('코드 블록', { exact: true }).click();

		const codeBlock = page.locator('.post-write-blocknote [data-content-type="codeBlock"]').first();
		await expect(codeBlock).toHaveAttribute('data-language', 'javascript');
		const code = codeBlock.locator('pre code');
		await page.keyboard.type('const answer = 42;');
		await expect(code.locator('.shiki').first()).toBeVisible();
		await page.keyboard.press('Enter');
		await page.keyboard.type('answer;');
		await expect(code).toContainText('const answer = 42;\nanswer;');
	});

	test('언어 선택 직후 Enter를 누르면 코드블록 안에서 개행한다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/코드');
		await page.keyboard.press('Enter');
		const block = page.locator('.post-write-blocknote [data-content-type="codeBlock"]').first();
		const code = block.locator('pre code');
		await page.keyboard.type('const first = 1;');
		await block.getByRole('button', { name: '코드 언어: Plain Text' }).click();
		await page.getByRole('option', { name: 'JavaScript' }).click();
		await expect(block).toHaveAttribute('data-language', 'javascript');
		await page.keyboard.press('Enter');
		await page.keyboard.type('const second = 2;');
		await expect(code).toContainText('const first = 1;\nconst second = 2;');
	});

	test('H4 마크다운은 제목으로 변환하고 H5 입력은 문단으로 유지한다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('#### ');
		await page.keyboard.type('넷째 제목');
		const heading = page.locator('.post-write-blocknote [data-content-type="heading"][data-level="4"]');
		await expect(heading).toContainText('넷째 제목');

		await page.keyboard.press('Enter');
		await page.keyboard.type('##### 다섯째 문장');
		await expect(page.locator('.post-write-blocknote [data-content-type="heading"]')).toHaveCount(1);
		await expect(page.locator('.post-write-blocknote [data-content-type="paragraph"]').last()).toContainText(
			'##### 다섯째 문장',
		);
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

	test('슬래시 메뉴와 파일 블록 팝오버에서 여러 이미지와 파일을 선택하면 모두 순서대로 추가한다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/이미지');
		await page.keyboard.press('Enter');
		const uploadInput = page.getByRole('tabpanel', { name: '업로드' }).locator('input[type="file"]');
		await expect(uploadInput).toHaveAttribute('multiple', '');
		await uploadInput.setInputFiles([
			{ name: 'first.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
			{ name: 'second.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
		]);
		await expect(page.locator('[data-content-type="image"] img')).toHaveCount(2);
		await page.locator('[data-content-type="image"]').first().click();
		await page.getByRole('button', { name: '이미지 교체' }).click();
		await page
			.getByRole('dialog')
			.getByRole('tabpanel', { name: '업로드' })
			.locator('input[type="file"]')
			.setInputFiles([
				{ name: 'replacement.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
				{ name: 'added.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
			]);
		await expect(page.locator('[data-content-type="image"] img')).toHaveCount(3);

		await editor.click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('/파일');
		await page.keyboard.press('Enter');
		await page
			.getByRole('tabpanel', { name: '업로드' })
			.locator('input[type="file"]')
			.setInputFiles([
				{ name: 'first.pdf', mimeType: 'application/pdf', buffer: Buffer.from('first') },
				{ name: 'second.pdf', mimeType: 'application/pdf', buffer: Buffer.from('second') },
			]);
		await expect(page.locator('[data-content-type="file"]')).toHaveCount(2);
		await expect(page.locator('[data-content-type="file"]')).toContainText(['first.pdf', 'second.pdf']);
	});

	test('두 이미지를 선택하면 첫 업로드가 지연되어도 두 블록이 함께 업로드 중으로 바뀐다', async ({ page }) => {
		let releaseUploads: () => void = () => undefined;
		const uploadsBlocked = new Promise<void>((resolve) => {
			releaseUploads = resolve;
		});
		await page.route('**/e2e-upload', async (route) => {
			await uploadsBlocked;
			await route.fulfill({ status: 200 });
		});
		try {
			await page.goto('/write');
			await page.getByRole('textbox', { name: '게시글 내용' }).click();
			await page.keyboard.type('/이미지');
			await page.keyboard.press('Enter');
			await page
				.getByRole('tabpanel', { name: '업로드' })
				.locator('input[type="file"]')
				.setInputFiles([
					{ name: 'first.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
					{ name: 'second.png', mimeType: 'image/png', buffer: TEST_IMAGE_BYTES },
				]);
			const imageBlocks = page.locator('[data-content-type="image"]');
			await expect(imageBlocks).toHaveCount(2);
			await expect(imageBlocks.getByText('Loading...', { exact: true })).toHaveCount(2);
		} finally {
			releaseUploads();
		}
		await expect(page.locator('[data-content-type="image"] img')).toHaveCount(2);
	});

	test('이미지와 파일을 함께 붙여넣거나 드롭하면 각각 업로드한다', async ({ page }) => {
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 내용' }).click();
		await page.evaluate(
			(bytes) => {
				const clipboard = new DataTransfer();
				clipboard.items.add(new File([new Uint8Array(bytes)], 'paste-first.png', { type: 'image/png' }));
				clipboard.items.add(new File(['pdf'], 'paste-second.pdf', { type: 'application/pdf' }));
				document
					.querySelector('[aria-label="게시글 내용"]')
					?.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
			},
			[...TEST_IMAGE_BYTES],
		);
		await expect(page.locator('[data-content-type="image"] img')).toHaveCount(1);
		await expect(page.locator('[data-content-type="file"]')).toContainText('paste-second.pdf');

		await page.evaluate(
			(bytes) => {
				const transfer = new DataTransfer();
				transfer.items.add(new File([new Uint8Array(bytes)], 'drop-first.png', { type: 'image/png' }));
				transfer.items.add(new File(['pdf'], 'drop-second.pdf', { type: 'application/pdf' }));
				document
					.querySelector('[aria-label="게시글 내용"]')
					?.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
			},
			[...TEST_IMAGE_BYTES],
		);
		await expect(page.locator('[data-content-type="image"] img')).toHaveCount(2);
		await expect(page.locator('[data-content-type="file"]')).toHaveCount(2);
		await expect(page.locator('[data-content-type="file"]').filter({ hasText: 'drop-second.pdf' })).toHaveCount(1);
	});

	test('파일 선택 업로드가 실패하면 이미지 블록에 오류를 표시하고 재시도할 수 있다', async ({ page }) => {
		let shouldFailUpload = true;
		await page.route('**/v1/uploads/presigned-url', (route) =>
			shouldFailUpload ? route.fulfill({ status: 500 }) : route.fallback(),
		);
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 내용' }).click();
		await page.keyboard.type('/이미지');
		await page.keyboard.press('Enter');
		await page.getByRole('tabpanel', { name: '업로드' }).locator('input[type="file"]').setInputFiles({
			name: 'selected.png',
			mimeType: 'image/png',
			buffer: TEST_IMAGE_BYTES,
		});

		const imageBlock = page.locator('[data-content-type="image"]');
		await expect(imageBlock.locator('.bn-add-file-button [role="alert"]')).toHaveText(
			'파일 업로드에 실패했어요. 다시 시도해 주세요.',
		);
		await expect(page.getByText('오류: 업로드 실패')).not.toBeVisible();
		await expect(page.getByText('Loading...', { exact: true })).not.toBeVisible();
		await page.getByRole('textbox', { name: '게시글 제목' }).fill('업로드 재시도');
		await expect(imageBlock.locator('.bn-add-file-button [role="alert"]')).toBeVisible();

		shouldFailUpload = false;
		await imageBlock.getByText('이미지 추가', { exact: true }).click();
		await expect(imageBlock.locator('.bn-add-file-button [role="alert"]')).toBeVisible();
		await page.getByRole('tabpanel', { name: '업로드' }).locator('input[type="file"]').setInputFiles({
			name: 'retried.png',
			mimeType: 'image/png',
			buffer: TEST_IMAGE_BYTES,
		});
		await expect(page.locator('[data-content-type="image"] img')).toHaveAttribute('src', /e2e-upload\.png$/);
	});

	test('붙여넣은 파일 업로드가 실패하면 이미지 블록에 오류를 표시한다', async ({ page }) => {
		await page.route('**/v1/uploads/presigned-url', (route) => route.fulfill({ status: 500 }));
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 내용' }).click();
		await page.evaluate(
			(bytes) => {
				const file = new File([new Uint8Array(bytes)], 'pasted.png', { type: 'image/png' });
				const clipboard = new DataTransfer();
				clipboard.items.add(file);
				const editor = document.querySelector('[aria-label="게시글 내용"]');
				editor?.dispatchEvent(
					new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }),
				);
			},
			[...TEST_IMAGE_BYTES],
		);

		await expect(page.locator('[data-content-type="image"] .bn-add-file-button [role="alert"]')).toHaveText(
			'파일 업로드에 실패했어요. 다시 시도해 주세요.',
		);
		await expect(page.getByText('Loading...', { exact: true })).not.toBeVisible();
	});

	test('base64 이미지 HTML을 붙여넣으면 빈 이미지 블록에 오류를 표시하고 파일 업로드를 안내한다', async ({ page }) => {
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 내용' }).click();
		await page.evaluate(() => {
			const clipboard = new DataTransfer();
			clipboard.setData('text/html', '<img src="data:image/png;base64,private-image">');
			document
				.querySelector('[aria-label="게시글 내용"]')
				?.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
		});

		const imageBlock = page.locator('[data-content-type="image"]');
		await expect(imageBlock.locator('.bn-add-file-button [role="alert"]')).toContainText(
			'저장할 수 없는 주소가 포함되어 있습니다',
		);
		await expect(imageBlock.getByText('이미지 추가', { exact: true })).toBeVisible();
		await expect(imageBlock.locator('img[src^="data:"]')).toHaveCount(0);
	});
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
