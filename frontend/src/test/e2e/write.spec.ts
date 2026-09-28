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
		await page.evaluate(() => window.getSelection()?.removeAllRanges());

		if (thirdBounds === null) {
			throw new Error('셋째 문단의 위치를 찾을 수 없습니다.');
		}
		await page.mouse.move(bounds.x + 5, y);
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

	test('H4는 맞춤 크기로 표시하고 H5 마크다운 입력은 헤딩으로 바꾸지 않는다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('#### ');
		await page.keyboard.type('넷째 제목');
		const heading = page.locator('.post-write-blocknote [data-content-type="heading"][data-level="4"]');
		await expect(heading).toContainText('넷째 제목');
		await expect(heading).toHaveCSS('font-size', '20px');
		await expect(heading.locator('.bn-inline-content')).toHaveCSS('line-height', '30px');

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
