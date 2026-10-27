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
	withFile?: boolean;
}

const dispatchTransfer = (editor: Locator, input: TransferInput) =>
	editor.evaluate(
		(element, { input: transferInput, bytes }) => {
			const transfer = new DataTransfer();
			if (transferInput.format !== undefined) transfer.setData(transferInput.format, transferInput.content ?? '');
			if (transferInput.withFile)
				transfer.items.add(new File([new Uint8Array(bytes)], 'pasted.png', { type: 'image/png' }));
			const event =
				transferInput.eventType === 'paste'
					? new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
					: new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer });
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
	await page.goto('/write');
	await expect(page.getByRole('textbox', { name: '게시글 내용' })).toBeVisible();
});

const blockedTransfers: { name: string; input: TransferInput; blockType: 'image' | 'file' | 'video' }[] = [
	{
		name: 'HTML만 있는 HEIC 이미지 붙여넣기',
		blockType: 'image',
		input: {
			eventType: 'paste',
			format: 'text/html',
			content: '<p>삽입 금지</p><img src="data:image/heic;base64,cHJpdmF0ZQ==">',
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

for (const { name, input, blockType } of blockedTransfers) {
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
		await expect(editor).not.toContainText('삽입 금지');
		await expect(uploadBlock).toHaveCount(1);
		expect(uploadRequests).toEqual([]);
	});
}

test('파일만 붙여넣으면 정상 업로드된 이미지 주소를 표시한다', async ({ page }) => {
	const editor = page.getByRole('textbox', { name: '게시글 내용' });
	await editor.click();

	await dispatchTransfer(editor, { eventType: 'paste', withFile: true });

	await expect(editor.locator('[data-content-type="image"] img')).toHaveAttribute('src', /transfer-upload\.png$/);
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
		'https://cdn.rilog.test/remote-image.png',
	);
	await expect(editor.locator('[data-content-type="image"] .bn-add-file-button [role="alert"]')).toHaveText(
		TRANSFER_ERROR,
	);
});
