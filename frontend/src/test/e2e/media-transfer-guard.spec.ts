import { expect, test } from '@playwright/test';

import type { Locator, Route } from '@playwright/test';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

const TRANSFER_ERROR =
	'붙여넣은 이미지 또는 파일에 저장할 수 없는 주소가 포함되어 있습니다. 파일로 다시 업로드해 주세요.';
const TEST_IMAGE_BYTES = Array.from(
	Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
);

const respond = (route: Route, data: unknown) =>
	route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ status: 200, message: 'E2E fixture', data }),
	});

interface TransferInput {
	eventType: 'paste' | 'drop';
	format?: 'text/html' | 'blocknote/html' | 'text/plain';
	content?: string;
	plainText?: string;
	withFile?: boolean;
}

const dispatchTransfer = (editor: Locator, input: TransferInput) =>
	editor.evaluate(
		(element, { input: transferInput, bytes }) => {
			const transfer = new DataTransfer();
			if (transferInput.format !== undefined) transfer.setData(transferInput.format, transferInput.content ?? '');
			if (transferInput.plainText !== undefined) transfer.setData('text/plain', transferInput.plainText);
			if (transferInput.withFile)
				transfer.items.add(new File([new Uint8Array(bytes)], 'pasted.png', { type: 'image/png' }));
			const rect = element.getBoundingClientRect();
			const event =
				transferInput.eventType === 'paste'
					? new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
					: new DragEvent('drop', {
							bubbles: true,
							cancelable: true,
							clientX: rect.left + 16,
							clientY: rect.top + 16,
							dataTransfer: transfer,
						});
			element.dispatchEvent(event);
			return event.defaultPrevented;
		},
		{ input, bytes: TEST_IMAGE_BYTES },
	);

test.beforeEach(async ({ page }) => {
	await page.route('**/v1/**', (route) => route.abort('failed'));
	await mockAuthenticatedAccess(page);
	await page.route('**/v1/posts/count', (route) => respond(route, { totalPostsCount: 0 }));
	await page.route('**/v1/drafts/me?*', (route) =>
		respond(route, { drafts: [], page: 0, size: 10, numberOfElements: 0, hasNext: false }),
	);
	await page.route('**/v1/users/me/cologs/overview', (route) => respond(route, []));
	await page.route('**/v1/uploads/presigned-url', (route) =>
		respond(route, {
			uploadId: 'e2e-transfer-upload',
			objectKey: 'rilog/images/originals/transfer-upload.png',
			uploadUrl: new URL('/e2e-transfer-upload', page.url()).href,
			headers: {},
			expiresAt: '2026-08-28T00:00:00Z',
		}),
	);
	await page.route('**/e2e-transfer-upload', (route) => route.fulfill({ status: 200 }));
	await page.route('**/remote-image.png', (route) =>
		route.fulfill({ contentType: 'image/png', body: Buffer.from(TEST_IMAGE_BYTES) }),
	);
	await page.route('**/v1/uploads/image-imports', (route) =>
		respond(route, {
			objectKey: 'rilog/images/raw/imported/sample.webp',
			url: 'https://images.example.com/rilog/images/raw/imported/sample.webp',
		}),
	);
	await page.route('**/sample.webp', (route) =>
		route.fulfill({ contentType: 'image/webp', body: Buffer.from(TEST_IMAGE_BYTES) }),
	);
	await page.goto('/write');
	await expect(page.getByRole('textbox', { name: '게시글 내용' })).toBeVisible();
});

const blockedTransfers: {
	name: string;
	input: TransferInput;
	blockType: 'image' | 'file' | 'video';
	expectedText?: string;
}[] = [
	{
		name: 'HTML만 있는 HEIC 이미지 붙여넣기',
		blockType: 'image',
		expectedText: '함께 붙여넣은 본문',
		input: {
			eventType: 'paste',
			format: 'text/html',
			content: '<p>함께 붙여넣은 본문</p><img src="data:image/heic;base64,cHJpdmF0ZQ==">',
		},
	},
	{
		name: 'HTML과 단일 파일이 함께 있는 이미지 붙여넣기',
		blockType: 'image',
		input: {
			eventType: 'paste',
			format: 'text/html',
			content: '<img src="data:image/png;base64,cHJpdmF0ZQ==">',
			withFile: true,
		},
	},
	{
		name: 'BlockNote 전용 HTML의 파일 붙여넣기',
		blockType: 'file',
		input: {
			eventType: 'paste',
			format: 'blocknote/html',
			content:
				'<div data-node-type="blockOuter"><div data-node-type="blockContainer"><div data-content-type="file" data-url="&#1;data:application/pdf;base64,cHJpdmF0ZQ=="></div></div></div>',
		},
	},
	{
		name: 'blob 미디어 HTML 드롭',
		blockType: 'video',
		input: {
			eventType: 'drop',
			format: 'text/html',
			content: '<video src="blob:https://rilog.test/private-video"></video>',
		},
	},
];

for (const { name, input, blockType, expectedText } of blockedTransfers) {
	test(`${name}를 하면 임시 주소를 차단하고 업로드 블록에 오류를 표시한다`, async ({ page }) => {
		const title = page.getByRole('textbox', { name: '게시글 제목' });
		await title.fill('보존할 제목');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.insertText('보존할 본문');
		const uploadRequests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/v1/uploads/')) uploadRequests.push(request.url());
		});

		expect(await dispatchTransfer(editor, input)).toBe(true);

		const uploadBlock = editor.locator(`[data-content-type="${blockType}"]`);
		await expect(uploadBlock.locator('.bn-add-file-button [role="alert"]')).toHaveText(TRANSFER_ERROR);
		await expect(title).toHaveValue('보존할 제목');
		await expect(editor).toContainText('보존할 본문');
		if (expectedText !== undefined) {
			await expect(editor).toContainText(expectedText);
		}
		await expect(uploadBlock).toHaveCount(1);
		expect(uploadRequests).toEqual([]);
	});
}

test('여러 base64 이미지와 텍스트를 함께 붙여넣으면 텍스트를 보존하고 각 이미지를 오류 블록으로 치환한다', async ({
	page,
}) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();

	await dispatchTransfer(editor, {
		eventType: 'paste',
		format: 'text/html',
		content:
			'<p>첫 번째 문단</p><img src="data:image/png;base64,Zmlyc3Q="><p>두 번째 문단</p><img src="data:image/png;base64,c2Vjb25k">',
	});

	await expect(editor).toContainText('첫 번째 문단');
	await expect(editor).toContainText('두 번째 문단');
	const imageAlerts = editor.locator('[data-content-type="image"] .bn-add-file-button [role="alert"]');
	await expect(imageAlerts).toHaveCount(2);
	await expect(imageAlerts.nth(0)).toHaveText(TRANSFER_ERROR);
	await expect(imageAlerts.nth(1)).toHaveText(TRANSFER_ERROR);
});

test('파일만 붙여넣으면 정상 업로드된 이미지 주소를 표시한다', async ({ page }) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();

	await dispatchTransfer(editor, { eventType: 'paste', withFile: true });

	await expect(editor.locator('[data-content-type="image"] img')).toHaveAttribute(
		'src',
		/transfer-upload\.png(#\d+x\d+)?$/,
	);
	await expect(page.getByRole('alert').filter({ hasText: TRANSFER_ERROR })).toHaveCount(0);
});

test('차단 후 일반 텍스트와 서식 및 원격 이미지를 붙여넣으면 정상 삽입한다', async ({ page }) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();
	await dispatchTransfer(editor, {
		eventType: 'paste',
		format: 'text/html',
		content: '<img src="data:image/png;base64,cHJpdmF0ZQ==">',
	});
	await expect(page.getByRole('alert').filter({ hasText: TRANSFER_ERROR })).toHaveText(TRANSFER_ERROR);

	await page.keyboard.press('Enter');
	await dispatchTransfer(editor, {
		eventType: 'paste',
		format: 'text/plain',
		content: 'data:image/png;base64,코드 예제',
	});
	await expect(editor).toContainText('data:image/png;base64,코드 예제');
	await expect(editor.locator('[data-content-type="image"] .bn-add-file-button [role="alert"]')).toHaveText(
		TRANSFER_ERROR,
	);
	await page.keyboard.press('Enter');
	await dispatchTransfer(editor, {
		eventType: 'paste',
		format: 'text/html',
		content: '<p><strong>정상 서식</strong></p><img src="https://cdn.rilog.test/remote-image.png">',
	});

	await expect(editor.locator('strong')).toHaveText('정상 서식');
	await expect(editor.locator('[data-content-type="image"] img')).toHaveAttribute(
		'src',
		/(?:^|\/)rilog\/images\/raw\/imported\/sample\.webp(?:#1x1)?$/,
	);
	await expect(editor.locator('[data-content-type="image"] .bn-add-file-button [role="alert"]')).toHaveText(
		TRANSFER_ERROR,
	);
});

test('빈 줄 없이 붙어 있는 마크다운 이미지들이 포함된 텍스트를 붙여넣으면 각각 독립된 이미지 블록으로 생성되어 재업로드된다', async ({
	page,
}) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();

	const unnormalizedMarkdown = [
		'본문 첫 줄',
		'![](https://external.test/img-1.png)',
		'![](https://external.test/img-2.png)',
		'중간 본문',
		'![](https://external.test/img-2.png)',
		'마지막 본문',
	].join('\n');

	await dispatchTransfer(editor, {
		eventType: 'paste',
		format: 'text/plain',
		content: unnormalizedMarkdown,
	});

	await expect(editor.locator('[data-content-type="image"]')).toHaveCount(3);
	await expect(editor).toContainText('본문 첫 줄');
	await expect(editor).toContainText('중간 본문');
	await expect(editor).toContainText('마지막 본문');
});

test('마크다운 이미지 문법이 포함된 HTML 붙여넣기는 원래 서식을 유지한다', async ({ page }) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();

	await dispatchTransfer(editor, {
		eventType: 'paste',
		format: 'text/html',
		content: '<p><strong>굵은 본문</strong></p><p>![](https://external.test/img-1.png)</p>',
		plainText: '굵은 본문\n![](https://external.test/img-1.png)',
	});

	await expect(editor.locator('strong')).toHaveText('굵은 본문');
});

test('코드 블록에 연속된 마크다운 이미지 문법을 붙여넣으면 빈 줄 없이 보존한다', async ({ page }) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();
	await page.keyboard.type('/코드');
	await page.keyboard.press('Enter');
	const code = editor.locator('[data-content-type="codeBlock"] pre code');
	await expect(code).toBeAttached();

	const markdown = '![](https://external.test/img-1.png)\n![](https://external.test/img-2.png)';
	await dispatchTransfer(code, { eventType: 'paste', format: 'text/plain', content: markdown });

	await expect(code).toHaveText(markdown);
	await expect(editor.locator('[data-content-type="image"]')).toHaveCount(0);
});

test('이미 분리된 마크다운 이미지의 Windows 개행은 붙여넣기 이벤트를 다시 보내지 않는다', async ({ page }) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();

	const pasteCount = await editor.evaluate((element) => {
		const transfer = new DataTransfer();
		transfer.setData('text/plain', '본문\r\n\r\n![](https://external.test/img-1.png)\r\n\r\n다음 본문');
		let count = 0;
		element.addEventListener('paste', () => count++);
		element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }));
		return count;
	});

	expect(pasteCount).toBe(1);
});

test('외부 이미지 변환 중에는 블록에 로딩 오버레이가 표시되고 발행 버튼이 비활성화되며 완료 시 해제된다', async ({
	page,
}) => {
	let resolveImport: () => void = () => undefined;
	await page.route('**/v1/uploads/image-imports', async (route) => {
		await new Promise<void>((resolve) => {
			resolveImport = resolve;
		});
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: '성공',
				data: {
					objectKey: 'rilog/images/raw/imported/delayed.webp',
					url: 'https://images.example.com/rilog/images/raw/imported/delayed.webp',
				},
			}),
		});
	});

	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();

	await dispatchTransfer(editor, {
		eventType: 'paste',
		format: 'text/html',
		content: '<img src="https://cdn.rilog.test/remote-image.png">',
	});

	const imageBlock = editor.locator('[data-content-type="image"]');
	await expect(imageBlock).toHaveCount(1);
	await expect(imageBlock.locator('.post-write-image-import-overlay')).toBeVisible();
	await expect(imageBlock.getByRole('status', { name: '이미지 변환 중' })).toBeVisible();
	await expect(page.getByRole('button', { name: '발행' })).toBeDisabled();

	resolveImport();

	await expect(imageBlock.locator('.post-write-image-import-overlay')).toHaveCount(0);
	await expect(imageBlock.locator('img')).toHaveAttribute(
		'src',
		/(?:^|\/)rilog\/images\/raw\/imported\/delayed\.webp(?:#1x1)?$/,
	);
	await expect(page.getByRole('button', { name: '발행' })).toBeEnabled();
});
