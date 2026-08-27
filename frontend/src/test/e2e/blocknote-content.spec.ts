import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const SHARED_CONTENT_STYLES = new URL('../../shared/styles/blocknote-content.css', import.meta.url);
const POST_DETAIL_STYLES = new URL(
	'../../app/(with-sidebar)/(with-footer)/[slug]/posts/[postId]/post-detail.css',
	import.meta.url,
);
const POST_WRITE_STYLES = new URL('../../features/post-write/styles/blocknote-theme.css', import.meta.url);

interface BlockFixture {
	contentType: string;
	attributes?: string;
}

const block = (fixture: string | BlockFixture) => {
	const { contentType, attributes = '' } = typeof fixture === 'string' ? { contentType: fixture } : fixture;

	return `
	<div class="bn-block-outer">
		<div class="bn-block">
			<div class="bn-block-content" data-content-type="${contentType}" ${attributes}>
				<div class="bn-inline-content">가독성 점검 본문</div>
			</div>
		</div>
	</div>
`;
};

const renderBlockNoteFixture = async (
	page: Page,
	rootClass: 'post-detail-body' | 'post-write-blocknote',
	contentTypes: Array<string | BlockFixture>,
) => {
	const [sharedStyles, rootStyles] = await Promise.all([
		readFile(SHARED_CONTENT_STYLES, 'utf8'),
		readFile(rootClass === 'post-detail-body' ? POST_DETAIL_STYLES : POST_WRITE_STYLES, 'utf8'),
	]);

	await page.setContent(
		`<div class="${rootClass}"><div class="bn-block-group">${contentTypes.map(block).join('')}</div></div>`,
	);
	await page.addStyleTag({
		content: `:root { --text-body-2: 1rem; --text-title-1: 1.25rem; --text-title-1--line-height: 1.75rem; --text-title-2: 1.5rem; --text-title-2--line-height: 2rem; }\n${sharedStyles}\n${rootStyles.replace("@import '@blocknote/core/style.css';", '')}`,
	});
};

const getPadding = (page: Page, index: number) =>
	page
		.locator('.bn-block-outer')
		.nth(index)
		.evaluate((element) => {
			const style = getComputedStyle(element);

			return { top: style.paddingTop, bottom: style.paddingBottom };
		});

const ROOT_SPACING = [
	{ rootClass: 'post-detail-body' as const, outer: '9.6px', shared: '3.2px' },
	{ rootClass: 'post-write-blocknote' as const, outer: '8px', shared: '0px' },
];

const LIST_TYPES = ['bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem'];

test.describe('BlockNote 콘텐츠 여백', () => {
	test('상세 본문의 연속 문단 사이에만 간격을 둔다', async ({ page }) => {
		await renderBlockNoteFixture(page, 'post-detail-body', ['paragraph', 'paragraph', 'paragraph']);

		await expect.poll(() => getPadding(page, 0)).toEqual({ top: '0px', bottom: '0px' });
		await expect.poll(() => getPadding(page, 1)).toEqual({ top: '16px', bottom: '0px' });
		await expect.poll(() => getPadding(page, 2)).toEqual({ top: '16px', bottom: '0px' });

		await page.setViewportSize({ width: 390, height: 844 });
		await expect.poll(() => getPadding(page, 1)).toEqual({ top: '14px', bottom: '0px' });
	});

	test('상세 본문의 문단, 목록, 인용문에 같은 행간을 적용한다', async ({ page }) => {
		const textTypes = ['paragraph', ...LIST_TYPES, 'quote'];
		await renderBlockNoteFixture(page, 'post-detail-body', textTypes);

		for (const [index, textType] of textTypes.entries()) {
			await expect(page.locator(`.bn-block-content[data-content-type="${textType}"] .bn-inline-content`)).toHaveCSS(
				'line-height',
				'26.4px',
			);
			await expect(page.locator('.bn-block-content').nth(index)).toHaveCSS('font-size', '16px');
		}
	});

	test('상세 본문 제목의 폰트 크기를 유지하고 위쪽 간격을 더 크게 둔다', async ({ page }) => {
		await renderBlockNoteFixture(page, 'post-detail-body', [
			'paragraph',
			{ contentType: 'heading', attributes: 'data-level="2"' },
			{ contentType: 'heading', attributes: 'data-level="3"' },
		]);

		const level2Heading = page.locator('.bn-block-content[data-content-type="heading"][data-level="2"]');
		const level3Heading = page.locator('.bn-block-content[data-content-type="heading"][data-level="3"]');

		await expect(level2Heading).toHaveCSS('font-size', '24px');
		await expect(level2Heading).toHaveCSS('padding-top', '39.6px');
		await expect(level2Heading).toHaveCSS('padding-bottom', '14.4px');
		await expect(level3Heading).toHaveCSS('font-size', '20px');
		await expect(level3Heading).toHaveCSS('padding-top', '29px');
		await expect(level3Heading).toHaveCSS('padding-bottom', '10px');
	});

	for (const { rootClass, outer, shared } of ROOT_SPACING) {
		for (const listType of LIST_TYPES) {
			test(`${rootClass}의 연속된 ${listType} 여백을 같은 타입끼리만 합친다`, async ({ page }) => {
				await renderBlockNoteFixture(page, rootClass, [listType, listType, listType]);

				await expect.poll(() => getPadding(page, 0)).toEqual({ top: outer, bottom: shared });
				await expect.poll(() => getPadding(page, 1)).toEqual({ top: shared, bottom: shared });
				await expect.poll(() => getPadding(page, 2)).toEqual({ top: shared, bottom: outer });
			});
		}

		test(`${rootClass}에서 서로 다른 리스트 타입의 기본 여백을 유지한다`, async ({ page }) => {
			await renderBlockNoteFixture(page, rootClass, ['bulletListItem', 'checkListItem']);

			await expect.poll(() => getPadding(page, 0)).toEqual({ top: outer, bottom: outer });
			await expect.poll(() => getPadding(page, 1)).toEqual({ top: outer, bottom: outer });
		});
	}

	test('이미지와 구분선에는 특수 블록 공통 여백을 적용하지 않는다', async ({ page }) => {
		await renderBlockNoteFixture(page, 'post-write-blocknote', [
			'paragraph',
			'quote',
			'image',
			'paragraph',
			'quote',
			'divider',
			'paragraph',
		]);

		await expect.poll(() => getPadding(page, 1)).toEqual({ top: '16px', bottom: '16px' });
		await expect.poll(() => getPadding(page, 2)).toEqual({ top: '0px', bottom: '0px' });
		await expect.poll(() => getPadding(page, 4)).toEqual({ top: '16px', bottom: '16px' });
		await expect.poll(() => getPadding(page, 5)).toEqual({ top: '0px', bottom: '0px' });
	});

	test('나머지 특수 블록은 데스크톱과 모바일 공통 여백을 유지한다', async ({ page }) => {
		await renderBlockNoteFixture(page, 'post-write-blocknote', ['paragraph', 'quote', 'paragraph']);
		await expect.poll(() => getPadding(page, 1)).toEqual({ top: '16px', bottom: '16px' });

		await page.setViewportSize({ width: 390, height: 844 });
		await expect.poll(() => getPadding(page, 1)).toEqual({ top: '12px', bottom: '12px' });
	});
});
