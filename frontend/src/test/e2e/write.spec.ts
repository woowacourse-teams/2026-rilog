import { devices, expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

const TEST_IMAGE_BYTES = Array.from(
	Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
);
const IPHONE_13 = {
	deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
	hasTouch: devices['iPhone 13'].hasTouch,
	isMobile: devices['iPhone 13'].isMobile,
	userAgent: devices['iPhone 13'].userAgent,
	viewport: devices['iPhone 13'].viewport,
};

const MY_COLOGS_OVERVIEW_ROUTE = '**/v1/users/me/cologs/overview';
const PRESIGNED_URL_ROUTE = '**/v1/uploads/presigned-url';
const MOCK_UPLOAD_ROUTE = '**/e2e-upload';
const PUBLISH_POST_ROUTE = '**/v1/posts';

const fillPost = async (page: Page) => {
	await page.getByRole('textbox', { name: '게시글 제목' }).fill('BlockNote 도입 회고');
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();
	await page.keyboard.type('오늘 배운 내용을 기록합니다.');
};

const expectBodyImage = async (page: Page) => {
	await expect(page.locator('[data-content-type="image"] img')).toHaveAttribute('src', /e2e-upload\.png$/);
};

const enableWriteAccess = async (page: Page) => {
	await mockAuthenticatedAccess(page);
	await page.route(MY_COLOGS_OVERVIEW_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: '나의 팀 목록 요약 조회에 성공했습니다.',
				data: [
					{
						cologId: 7,
						slug: 'rilog',
						name: 'Rilog',
						profileImageUrl: 'cologs/rilog.png',
						chapters: [],
					},
				],
			}),
		}),
	);
	await page.route(PRESIGNED_URL_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: 'Presigned URL 발급에 성공했습니다.',
				data: {
					uploadId: 'e2e-upload-id',
					objectKey: 'rilog/images/originals/e2e-upload.png',
					uploadUrl: 'http://localhost:3000/e2e-upload',
					headers: {},
					expiresAt: '2026-08-28T00:00:00Z',
				},
			}),
		}),
	);
	await page.route(MOCK_UPLOAD_ROUTE, (route) => route.fulfill({ status: 200 }));
	await page.route(PUBLISH_POST_ROUTE, (route) => {
		if (route.request().method() !== 'POST') return route.fallback();

		return route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 201,
				message: '게시글 발행에 성공했습니다.',
				data: { postId: 31, slug: 'rilog' },
			}),
		});
	});
};

const getSlashMenuPosition = async (page: Page) => {
	await expect(page.locator('#bn-suggestion-menu')).toBeVisible();

	return page.evaluate(() => {
		const selection = window.getSelection();
		const range = selection?.rangeCount === 0 ? undefined : selection?.getRangeAt(0);
		const caretRect = range?.getBoundingClientRect();
		const menuRect = document.querySelector<HTMLElement>('#bn-suggestion-menu')?.getBoundingClientRect();

		if (caretRect === undefined || menuRect === undefined) {
			throw new Error('슬래시 메뉴 또는 커서 위치를 찾을 수 없습니다.');
		}

		return {
			caretBottom: caretRect.bottom,
			caretTop: caretRect.top,
			menuBottom: menuRect.bottom,
			menuTop: menuRect.top,
			menuLeft: menuRect.left,
			menuRight: menuRect.right,
			viewportBottom: (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? window.innerHeight),
			viewportTop: window.visualViewport?.offsetTop ?? 0,
			viewportWidth: window.innerWidth,
		};
	});
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
	test.beforeEach(async ({ page }) => {
		await enableWriteAccess(page);
	});

	test('코드 블록에서 언어를 선택하고 구문을 강조한다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/코드 블록');
		await page.keyboard.press('Enter');

		const codeBlock = page.locator('[data-content-type="codeBlock"]');
		const languageTrigger = page.getByRole('button', { name: '코드 언어: JavaScript' });
		await expect(codeBlock).toBeVisible();
		await expect(codeBlock).toHaveCSS('background-color', 'rgb(255, 255, 255)');
		await expect(codeBlock).toHaveCSS('color', 'rgb(31, 35, 40)');
		await expect(languageTrigger).toHaveAttribute('aria-expanded', 'false');
		await page.keyboard.type('const message = "highlighted";');

		await expect.poll(() => codeBlock.locator('span.shiki').count()).toBeGreaterThan(0);
		expect(
			await codeBlock
				.locator('span.shiki')
				.evaluateAll((elements) => new Set(elements.map((element) => getComputedStyle(element).color)).size),
		).toBeGreaterThan(1);

		await languageTrigger.click();
		const languageListbox = page.getByRole('listbox', { name: '코드 언어' });
		const triggerBox = await languageTrigger.boundingBox();
		const codeBox = await codeBlock.locator('pre').boundingBox();
		expect(triggerBox).not.toBeNull();
		expect(codeBox).not.toBeNull();
		expect(triggerBox!.y + triggerBox!.height).toBeLessThanOrEqual(codeBox!.y);
		await expect(languageListbox).toHaveCSS('background-color', 'rgb(255, 255, 255)');
		await expect(languageListbox).toHaveCSS('max-height', '288px');
		await expect(languageListbox).toHaveCSS('overflow-y', 'auto');
		expect(await languageListbox.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
		await page.getByRole('option', { name: 'TypeScript' }).click();
		const typescriptTrigger = page.getByRole('button', { name: '코드 언어: TypeScript' });
		await expect(typescriptTrigger).toBeVisible();
		await expect(codeBlock).toHaveAttribute('data-language', 'typescript');

		await typescriptTrigger.click();
		await page.getByRole('option', { name: 'Plain Text' }).click();
		await expect(codeBlock).toHaveAttribute('data-language', 'text');
		await expect(codeBlock.locator('span.shiki')).toHaveCount(0);
		await expect(codeBlock.locator('pre > code')).toHaveCSS('color', 'rgb(31, 35, 40)');
	});

	test('Mermaid 코드블록을 다이어그램으로 미리보기한다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/코드 블록');
		await page.keyboard.press('Enter');

		const codeBlock = page.locator('[data-content-type="codeBlock"]');
		await page.getByRole('button', { name: '코드 언어: JavaScript' }).click();
		await page.getByRole('option', { name: 'Mermaid' }).click();
		await expect(codeBlock).toHaveAttribute('data-language', 'mermaid');

		await codeBlock.locator('pre').click();
		await page.keyboard.type('graph TD');
		await page.keyboard.press('Enter');
		await page.keyboard.type('A[Start] --> B[End]');

		const diagram = page.getByRole('img', { name: 'Mermaid 다이어그램 미리보기' });
		await expect(diagram).toBeVisible({ timeout: 15_000 });
		await expect(diagram).toHaveCSS('border-top-width', '0px');
		await expect(diagram.locator('svg')).toBeVisible();
		await expect(diagram.locator('.nodeLabel').first()).toHaveCSS('font-size', '14px');
		await expect(diagram).toContainText('Start');
		await expect(diagram).toContainText('End');

		await page.keyboard.press('Enter');
		await page.keyboard.type('not a diagram');
		await expect(codeBlock.getByRole('alert')).toHaveText('Mermaid 문법을 확인해 주세요.');
		await expect(page.getByText('Syntax error in text', { exact: true })).toHaveCount(0);
		await expect(page.locator('body > div[id^="dmermaid-"]')).toHaveCount(0);
	});

	test('postId로 조회한 게시글의 문서와 게시 설정을 편집 초기값으로 보여 준다', async ({ page }) => {
		await page.route('**/v1/posts/31', (route) =>
			route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					status: 200,
					message: '게시글 상세 조회에 성공했습니다.',
					data: {
						title: '불러온 게시글 제목',
						content: [
							{
								id: 'edit-paragraph',
								type: 'paragraph',
								props: {
									backgroundColor: 'default',
									textColor: 'default',
									textAlignment: 'left',
								},
								content: [{ type: 'text', text: '불러온 게시글 본문', styles: {} }],
								children: [],
							},
						],
						publishedAt: '2026-08-24T00:00:00Z',
						thumbnailImageUrl: 'posts/edit-thumbnail.png',
						category: 'DAILY',
						author: { userId: 1, nickname: 'E2E 사용자', slug: 'e2e-user', profileImageUrl: null },
						owner: {
							type: 'RILOG',
							blogId: 1,
							slug: 'e2e-user',
							name: 'E2E 사용자',
							profileImageUrl: null,
						},
					},
				}),
			}),
		);

		await page.goto('/write?postId=31');

		await expect(page.getByRole('textbox', { name: '게시글 제목' })).toHaveValue('불러온 게시글 제목');
		await expect(page.getByRole('textbox', { name: '게시글 내용' })).toContainText('불러온 게시글 본문');
		await page.getByRole('textbox', { name: '게시글 제목' }).fill('불러온 게시글 제목 수정');
		await page.getByRole('button', { name: '수정' }).click();
		await expect(page.getByRole('radio', { name: '일상' })).toBeChecked();
		await expect(page.getByRole('combobox', { name: 'Colog' })).toHaveValue('1');
		await expect(page.getByRole('option', { name: 'E2E 사용자' })).toHaveCount(1);
		await expect(page.getByRole('img', { name: '게시글 대표 이미지 미리보기' })).toHaveAttribute(
			'src',
			/posts\/edit-thumbnail\.png$/,
		);
	});

	test('512px 미만의 좁은 데스크톱 화면에서 발행 버튼을 하단에 고정한다', async ({ page }) => {
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
		const cologSelect = publishDialog.getByRole('combobox', { name: 'Colog' });
		await cologSelect.selectOption({ index: 1 });
		const selectedCoLogId = await cologSelect.inputValue();
		await publishDialog.getByRole('button', { name: '취소' }).click();
		await expect(publishDialog).toBeHidden();

		await page.getByRole('button', { name: '발행' }).click();
		await expect(publishDialog.getByRole('radio', { name: '일상' })).toBeChecked();
		await expect(publishDialog.getByRole('combobox', { name: 'Colog' })).toHaveValue(selectedCoLogId);
		await publishDialog.getByRole('button', { name: '발행' }).click();
		await expect(publishDialog.getByRole('button', { name: '발행' })).toBeDisabled();
		await expect(publishDialog.getByRole('button', { name: '취소' })).toBeDisabled();

		await expect(page).toHaveURL('/@rilog/posts/31');
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

	test('좁은 데스크톱 viewport에서 작성 화면과 게시 설정이 가로로 넘치지 않는다', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/write');
		await fillPost(page);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

		await page.getByRole('button', { name: '발행' }).press('Enter');
		await expect(page.getByRole('dialog', { name: '게시 설정' })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	});

	test('커서 아래 공간이 부족하면 슬래시 메뉴를 위에 표시하고 viewport 안에 유지한다', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 400 });
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.evaluate(() => window.scrollTo({ top: 0 }));
		await page.keyboard.type('/');

		const position = await getSlashMenuPosition(page);
		expect(position.menuBottom).toBeLessThanOrEqual(position.caretTop);
		expect(position.menuTop).toBeGreaterThanOrEqual(position.viewportTop);
		expect(position.menuBottom).toBeLessThanOrEqual(position.viewportBottom);
		expect(position.menuLeft).toBeGreaterThanOrEqual(0);
		expect(position.menuRight).toBeLessThanOrEqual(position.viewportWidth);

		await page.keyboard.type('이미지');
		const filteredPosition = await getSlashMenuPosition(page);
		expect(filteredPosition.menuBottom).toBeLessThanOrEqual(filteredPosition.caretTop);
		expect(filteredPosition.menuTop).toBeGreaterThanOrEqual(filteredPosition.viewportTop);
		expect(filteredPosition.menuBottom).toBeLessThanOrEqual(filteredPosition.viewportBottom);
	});

	test('커서 아래 공간이 충분하면 슬래시 메뉴를 아래에 표시한다', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/이미지');

		const position = await getSlashMenuPosition(page);
		expect(position.menuTop).toBeGreaterThanOrEqual(position.caretBottom);
		expect(position.menuTop).toBeGreaterThanOrEqual(position.viewportTop);
		expect(position.menuBottom).toBeLessThanOrEqual(position.viewportBottom);
	});

	test('특수 블록에 데스크톱과 모바일의 공통 세로 여백을 적용한다', async ({ page }) => {
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

test.describe('모바일 글쓰기 차단', () => {
	test.use(IPHONE_13);

	test('모바일 기기에서는 editor를 생성하지 않고 PC 이용을 안내한다', async ({ page }) => {
		await page.context().addCookies([
			{
				name: PROXY_SESSION_COOKIE_NAME,
				value: PROXY_SESSION_COOKIE_VALUE,
				url: 'http://localhost:3000',
			},
		]);
		await page.goto('/write');

		await expect(page.getByRole('heading', { name: '글 작성은 PC에서 이용해 주세요' })).toBeVisible();
		await expect(page.getByRole('link', { name: '피드로 돌아가기' })).toHaveAttribute('href', '/feeds');
		await expect(page.getByRole('textbox', { name: '게시글 내용' })).not.toBeAttached();
		await expect(page.locator('.bn-editor')).not.toBeAttached();
	});
});
