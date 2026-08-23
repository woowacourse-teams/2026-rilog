import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

const TEST_IMAGE_BYTES = Array.from(
	Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
);
const AUTH_REFRESH_ROUTE = '**/v1/auth/token/refresh';
const MY_COLOGS_PREVIEW_ROUTE = '**/v1/users/me/cologs/preview';
const MY_INFO_ROUTE = '**/v1/users/me';

const fillPost = async (page: Page) => {
	await page.getByRole('textbox', { name: '게시글 제목' }).fill('BlockNote 도입 회고');
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();
	await page.keyboard.type('오늘 배운 내용을 기록합니다.');
};

const expectBodyImage = async (page: Page) => {
	await expect(page.locator('[data-content-type="image"] img')).toHaveAttribute('src', /^data:image\/png;base64,/);
};

const enableWriteAccess = async (page: Page) => {
	await page.context().addCookies([
		{
			name: PROXY_SESSION_COOKIE_NAME,
			value: PROXY_SESSION_COOKIE_VALUE,
			url: 'http://localhost:3000',
		},
	]);
	await page.route(AUTH_REFRESH_ROUTE, (route) =>
		route.fulfill({
			status: 204,
			headers: {
				Authorization: 'Bearer e2e-access-token',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Origin': 'http://localhost:3000',
				'Access-Control-Expose-Headers': 'Authorization',
			},
		}),
	);
	await page.route(MY_INFO_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: '내 정보 조회에 성공했습니다.',
				data: { id: 1, slug: 'e2e-user', nickname: 'E2E 사용자', profileImageUrl: null },
			}),
		}),
	);
	await page.route(MY_COLOGS_PREVIEW_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ status: 200, message: '내 Co-log 미리보기 조회에 성공했습니다.', data: [] }),
		}),
	);
};

const insertQuoteAfterParagraph = async (page: Page) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();
	await page.keyboard.type('일반 문단');
	await page.keyboard.press('Enter');
	await page.keyboard.type('/인용');
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-content-type="quote"]')).toBeVisible();
};

const getBlockOuterPaddingTop = async (page: Page, contentType: string) => {
	return page.locator(`[data-content-type="${contentType}"]`).evaluate((content) => {
		const outer = content.closest<HTMLElement>('.bn-block-outer');
		if (outer === null) {
			throw new Error('BlockNote 블록 외곽 요소를 찾을 수 없습니다.');
		}

		return getComputedStyle(outer).paddingTop;
	});
};

test.describe('글 작성', () => {
	test('512px 미만 모바일 화면에서 발행 버튼을 하단에 고정한다', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 500 });
		await page.goto('/write');
		const publishButton = page.getByRole('button', { name: '발행' });

		const expectButtonAtViewportBottom = async () => {
			const buttonBox = await publishButton.boundingBox();
			expect(buttonBox).not.toBeNull();
			expect(500 - (buttonBox!.y + buttonBox!.height)).toBeLessThanOrEqual(16);
		};

		await expectButtonAtViewportBottom();
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await expectButtonAtViewportBottom();
	});

	test('클립보드 이미지를 본문에 붙여넣는다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await editor.evaluate((element, imageBytes) => {
			const clipboardData = new DataTransfer();
			clipboardData.items.add(new File([new Uint8Array(imageBytes)], 'clipboard.png', { type: 'image/png' }));
			element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
		}, TEST_IMAGE_BYTES);

		await expectBodyImage(page);
	});

	test('이미지 파일을 본문에 끌어다 놓는다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.evaluate((element, imageBytes) => {
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(new File([new Uint8Array(imageBytes)], 'dropped.png', { type: 'image/png' }));
			const bounds = element.getBoundingClientRect();
			element.dispatchEvent(
				new DragEvent('drop', {
					dataTransfer,
					bubbles: true,
					cancelable: true,
					clientX: bounds.left + 20,
					clientY: bounds.top + 20,
				}),
			);
		}, TEST_IMAGE_BYTES);

		await expectBodyImage(page);
	});

	test('이미지 블록의 파일 선택으로 이미지를 업로드한다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/이미지');
		await page.keyboard.press('Enter');

		await page
			.getByRole('tabpanel', { name: '업로드' })
			.locator('input[type="file"]')
			.setInputFiles({
				name: 'selected.png',
				mimeType: 'image/png',
				buffer: Buffer.from(TEST_IMAGE_BYTES),
			});

		await expectBodyImage(page);
	});

	test('긴 제목은 내부 스크롤 없이 내용 높이만큼 확장된다', async ({ page }) => {
		await page.goto('/write');
		const title = page.getByRole('textbox', { name: '게시글 제목' });
		await title.fill('내용에 맞춰 아래로 계속 확장되는 긴 게시글 제목입니다. '.repeat(6));

		const { height, lineHeight, overflow, scrollHeight } = await title.evaluate((element) => ({
			height: element.clientHeight,
			lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
			overflow: getComputedStyle(element).overflowY,
			scrollHeight: element.scrollHeight,
		}));

		expect(height).toBeGreaterThan(lineHeight * 2);
		expect(height).toBeGreaterThanOrEqual(scrollHeight - 1);
		expect(overflow).toBe('hidden');
	});

	test('본문 편집기에 접근 가능한 이름과 오류 설명을 연결한다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await expect(editor).toBeVisible();

		await page.getByRole('button', { name: '발행' }).click();
		const bodyError = page.getByText('내용을 입력해 주세요.');
		const bodyErrorId = await bodyError.getAttribute('id');

		expect(bodyErrorId).not.toBeNull();
		await expect(editor).toHaveAttribute('aria-describedby', bodyErrorId!);
		await editor.fill('본문');
		await expect(editor).not.toHaveAttribute('aria-describedby');
	});

	test('발행 설정을 유지하고 mock 발행 후 게시글 URL로 이동한다', async ({ page }) => {
		await page.goto('/write');
		await fillPost(page);

		await page.getByRole('button', { name: '발행' }).click();
		const publishDialog = page.getByRole('dialog', { name: '게시 설정' });
		await expect(publishDialog).toBeVisible();
		await publishDialog.getByText('일상', { exact: true }).click();
		const cologSelect = publishDialog.getByRole('combobox', { name: 'Co-log' });
		await cologSelect.selectOption({ index: 1 });
		const selectedCoLogId = await cologSelect.inputValue();
		await publishDialog.getByRole('button', { name: '취소' }).click();
		await expect(publishDialog).toBeHidden();

		await page.getByRole('button', { name: '발행' }).click();
		await expect(publishDialog.getByRole('radio', { name: '일상' })).toBeChecked();
		await expect(publishDialog.getByRole('combobox', { name: 'Co-log' })).toHaveValue(selectedCoLogId);
		await publishDialog.getByRole('button', { name: '발행' }).click();
		await expect(publishDialog.getByRole('button', { name: '발행' })).toBeDisabled();
		await expect(publishDialog.getByRole('button', { name: '취소' })).toBeDisabled();

		await expect(page).toHaveURL(/\/@rilog\/posts\/mock-/);
	});

	test('browser back에서 이탈을 취소하거나 계속한다', async ({ page }) => {
		await page.goto('/');
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 제목' }).fill('뒤로 가기 보호');

		await page.goBack();
		const confirmDialog = page.getByRole('dialog', { name: '작성 중인 글을 나갈까요?' });
		await expect(confirmDialog).toBeVisible();
		await confirmDialog.getByRole('button', { name: '계속 작성' }).click();
		await expect(page).toHaveURL('/write');

		await page.goBack();
		await confirmDialog.getByRole('button', { name: '나가기' }).click();
		await expect(page).toHaveURL('/feeds');
	});

	test('같은 origin 링크 이동을 확인하고 취소 또는 계속한다', async ({ page }) => {
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 제목' }).fill('링크 이탈 보호');
		await page.evaluate(() => {
			const link = document.createElement('a');
			link.href = '/';
			link.textContent = '홈으로 이동';
			document.body.append(link);
		});

		const homeLink = page.getByRole('link', { name: '홈으로 이동' });
		const clickHomeLink = () =>
			homeLink.evaluate((element) => {
				if (element instanceof HTMLAnchorElement) {
					element.click();
				}
			});

		await clickHomeLink();
		const confirmDialog = page.getByRole('dialog', { name: '작성 중인 글을 나갈까요?' });
		await confirmDialog.getByRole('button', { name: '계속 작성' }).click();
		await expect(page).toHaveURL('/write');

		await clickHomeLink();
		await confirmDialog.getByRole('button', { name: '나가기' }).click();
		await expect(page).toHaveURL('/feeds');
	});

	test('작성 중 reload는 브라우저 기본 경고로 보호한다', async ({ page }) => {
		await page.goto('/write');
		await page.getByRole('textbox', { name: '게시글 제목' }).fill('새로고침 보호');
		const dialogPromise = page.waitForEvent('dialog');
		void page.reload().catch(() => undefined);
		const dialog = await dialogPromise;

		expect(dialog.type()).toBe('beforeunload');
		await dialog.dismiss();
	});

	test('mobile viewport에서 작성 화면과 게시 설정이 가로로 넘치지 않는다', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/write');
		await fillPost(page);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

		await page.getByRole('button', { name: '발행' }).click();
		await expect(page.getByRole('dialog', { name: '게시 설정' })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	});

	test('특수 블록에 데스크톱과 모바일의 공통 세로 여백을 적용한다', async ({ page }) => {
		await enableWriteAccess(page);
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/write');
		await insertQuoteAfterParagraph(page);
		expect(await getBlockOuterPaddingTop(page, 'quote')).toBe('16px');

		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/write');
		await insertQuoteAfterParagraph(page);
		expect(await getBlockOuterPaddingTop(page, 'quote')).toBe('12px');
	});
});
