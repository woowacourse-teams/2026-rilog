import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import ts from 'typescript';

import type { Page } from '@playwright/test';

import type { getInlineCommentOffsetAtPoint } from '@/features/post-detail/lib/inline-comment-interaction';
import type { restoreInlineCommentRange } from '@/features/post-detail/lib/inline-comment-range';
import type { createInlineCommentSelectionDraft } from '@/features/post-detail/lib/inline-comment-selection';

declare global {
	interface Window {
		inlineCommentFoundation: {
			createInlineCommentSelectionDraft: typeof createInlineCommentSelectionDraft;
			restoreInlineCommentRange: typeof restoreInlineCommentRange;
			getInlineCommentOffsetAtPoint: typeof getInlineCommentOffsetAtPoint;
		};
	}
}

// Actual browser Selection/Range geometry cannot be verified by jsdom.
// Load the production utilities without a test route or an external API dependency.
const browserModule = async (name: string) => {
	const source = await readFile(new URL(`../../features/post-detail/lib/${name}.ts`, import.meta.url), 'utf8');
	return ts.transpileModule(source, {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
	}).outputText;
};
const moduleUrl = (source: string) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

const renderFixture = async (page: Page) => {
	await page.route('**/*', (route) => route.abort());
	await page.setContent(`
		<article class="post-detail-body" style="width: 70%; margin: 40px">
			<div class="bn-block-outer" data-id="paragraph">
				<p data-inline-comment-root data-inline-comment-block-id="paragraph">앞 😀 <code>inlineCode</code> 뒤쪽 텍스트</p>
			</div>
			<div class="bn-block-outer" data-id="soft-break">
				<p data-inline-comment-root data-inline-comment-block-id="soft-break">첫 줄<br>둘째 줄</p>
			</div>
			<div class="bn-block-outer" data-id="code" data-content-type="codeBlock">
				<code data-inline-comment-root data-inline-comment-block-id="code">const value = 1;</code>
			</div>
		</article>
	`);
	const styles = await readFile(
		new URL('../../app/(with-sidebar)/(with-footer)/blog/[slug]/posts/[postId]/post-detail.css', import.meta.url),
		'utf8',
	);
	await page.addStyleTag({ content: styles.replace("@import '@blocknote/core/style.css';", '') });
	const selection = moduleUrl(await browserModule('inline-comment-selection'));
	const range = moduleUrl(await browserModule('inline-comment-range'));
	const interaction = moduleUrl(
		(await browserModule('inline-comment-interaction')).replace('./inline-comment-selection', selection),
	);
	await page.addScriptTag({
		type: 'module',
		content: `
		import { createInlineCommentSelectionDraft } from '${selection}';
		import { restoreInlineCommentRange } from '${range}';
		import { getInlineCommentOffsetAtPoint } from '${interaction}';
		window.inlineCommentFoundation = { createInlineCommentSelectionDraft, restoreInlineCommentRange, getInlineCommentOffsetAtPoint };
	`,
	});
	await expect.poll(() => page.evaluate(() => Boolean(window.inlineCommentFoundation))).toBe(true);
};

test.beforeEach(async ({ page }) => renderFixture(page));

test('인라인 코드를 가로질러 드래그하면 UTF-16 선택과 복원 범위가 일치한다', async ({ page }) => {
	const paragraph = page.locator('[data-inline-comment-block-id="paragraph"]');
	const bounds = await paragraph.evaluate((element) => {
		const range = document.createRange();
		range.selectNodeContents(element);
		const rects = Array.from(range.getClientRects());
		return { left: rects[0].left, right: rects[rects.length - 1].right, y: rects[0].top + rects[0].height / 2 };
	});
	await page.mouse.move(bounds.left + 1, bounds.y);
	await page.mouse.down();
	await page.mouse.move(bounds.right - 1, bounds.y, { steps: 12 });
	await page.mouse.up();
	const result = await page.evaluate(() => {
		const article = document.querySelector('article')!;
		const root = document.querySelector<HTMLElement>('[data-inline-comment-block-id="paragraph"]')!;
		const selected = window.getSelection()!;
		const draft = window.inlineCommentFoundation.createInlineCommentSelectionDraft(selected, article)!;
		const restored = window.inlineCommentFoundation.restoreInlineCommentRange(root, draft)!;
		return {
			text: selected.toString(),
			draftText: draft.selectedText,
			restoredText: restored.toString(),
			length: draft.endOffset - draft.startOffset,
			rects: Array.from(restored.getClientRects()).filter((rect) => rect.width > 0).length,
		};
	});
	expect(result.text).toContain('😀');
	expect(result.text).toContain('inlineCode');
	expect(result.draftText).toBe(result.text);
	expect(result.restoredText).toBe(result.text);
	expect(result.length).toBe(result.text.length);
	expect(result.rects).toBeGreaterThan(0);
});

test('Shift+Enter 줄바꿈을 포함한 선택은 같은 인용문과 범위로 복원된다', async ({ page }) => {
	const result = await page.evaluate(() => {
		const article = document.querySelector('article')!;
		const root = document.querySelector<HTMLElement>('[data-inline-comment-block-id="soft-break"]')!;
		const firstLine = root.firstChild!;
		const secondLine = root.lastChild!;
		const range = document.createRange();
		range.setStart(firstLine, 2);
		range.setEnd(secondLine, 3);
		const selection = window.getSelection()!;
		selection.removeAllRanges();
		selection.addRange(range);
		const draft = window.inlineCommentFoundation.createInlineCommentSelectionDraft(selection, article)!;
		const restored = window.inlineCommentFoundation.restoreInlineCommentRange(root, draft)!;
		return {
			selectedText: draft.selectedText,
			offsets: [draft.startOffset, draft.endOffset],
			restoredStart: [restored.startContainer.textContent, restored.startOffset],
			restoredEnd: [restored.endContainer.textContent, restored.endOffset],
		};
	});
	expect(result.selectedText).toBe('줄\n둘째 ');
	expect(result.offsets).toEqual([2, 7]);
	expect(result.restoredStart).toEqual(['첫 줄', 2]);
	expect(result.restoredEnd).toEqual(['둘째 줄', 3]);
});

test('블록 경계 선택과 본문 밖에서 시작한 드래그는 본문 root 안으로 제한된다', async ({ page }) => {
	const result = await page.evaluate(() => {
		const article = document.querySelector<HTMLElement>('article')!;
		const root = document.querySelector<HTMLElement>('[data-inline-comment-block-id="paragraph"]')!;
		const tripleClickRange = document.createRange();
		tripleClickRange.selectNode(root);
		const selection = window.getSelection()!;
		selection.removeAllRanges();
		selection.addRange(tripleClickRange);
		const tripleClickDraft = window.inlineCommentFoundation.createInlineCommentSelectionDraft(selection, article);

		const outside = document.createElement('span');
		outside.textContent = 'outside';
		document.body.prepend(outside);
		const outsideDragRange = document.createRange();
		outsideDragRange.setStart(outside.firstChild!, 0);
		outsideDragRange.setEnd(root.firstChild!, 4);
		selection.removeAllRanges();
		selection.addRange(outsideDragRange);
		const outsideDragDraft = window.inlineCommentFoundation.createInlineCommentSelectionDraft(selection, article);
		outside.remove();
		return {
			tripleClickText: tripleClickDraft?.selectedText,
			outsideDrag: outsideDragDraft && {
				blockId: outsideDragDraft.blockId,
				selectedText: outsideDragDraft.selectedText,
				startOffset: outsideDragDraft.startOffset,
				endOffset: outsideDragDraft.endOffset,
			},
		};
	});
	expect(result.tripleClickText).toContain('inlineCode');
	expect(result.outsideDrag).toEqual({ blockId: 'paragraph', selectedText: '앞 😀', startOffset: 0, endOffset: 4 });
});

test('본문 드래그 선택 색상은 focus-ring 12%로 고정된다', async ({ page }) => {
	const colors = await page.evaluate(() => {
		const root = document.querySelector<HTMLElement>('[data-inline-comment-block-id="paragraph"]')!;
		const probe = document.createElement('span');
		probe.style.backgroundColor = 'color-mix(in oklab, var(--focus-ring) 12%, transparent)';
		document.body.append(probe);
		const expected = getComputedStyle(probe).backgroundColor;
		const actual = getComputedStyle(root, '::selection').backgroundColor;
		probe.remove();
		return { actual, expected };
	});
	expect(colors.actual).toBe(colors.expected);
});

test('실제 캐럿 좌표는 인라인 코드의 offset으로 변환되고 코드 블록 선택은 차단된다', async ({ page }) => {
	const result = await page.evaluate(() => {
		const article = document.querySelector('article')!;
		const root = document.querySelector<HTMLElement>('[data-inline-comment-block-id="paragraph"]')!;
		const range = window.inlineCommentFoundation.restoreInlineCommentRange(root, { startOffset: 6, endOffset: 7 })!;
		const rect = range.getBoundingClientRect();
		const offset = window.inlineCommentFoundation.getInlineCommentOffsetAtPoint(
			root,
			rect.left + 1,
			rect.top + rect.height / 2,
		);
		const code = document.querySelector<HTMLElement>('[data-inline-comment-block-id="code"]')!;
		const selection = window.getSelection()!;
		const codeRange = document.createRange();
		codeRange.selectNodeContents(code);
		selection.removeAllRanges();
		selection.addRange(codeRange);
		return {
			offset,
			blockedDraft: window.inlineCommentFoundation.createInlineCommentSelectionDraft(selection, article),
		};
	});
	expect(result.offset).toBe(6);
	expect(result.blockedDraft).toBeNull();
});

test('블록 댓글 진입점은 본문 우측에 배치되고 모바일에서 숨겨진다', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page
		.locator('.bn-block-outer')
		.first()
		.evaluate((host) => {
			(host as HTMLElement).dataset.inlineCommentHighlightHost = '';
			const button = document.createElement('button');
			button.dataset.inlineCommentBlockButton = '';
			button.setAttribute('aria-label', '이 블록의 댓글 1개 보기');
			button.innerHTML = '<span>1</span>';
			host.append(button);
		});
	const button = page.getByRole('button', { name: '이 블록의 댓글 1개 보기' });
	await expect(button).toBeVisible();
	const hostBox = await page.locator('.bn-block-outer').first().boundingBox();
	const buttonBox = await button.boundingBox();
	expect(buttonBox!.x).toBeGreaterThanOrEqual(hostBox!.x + hostBox!.width);
	await button.focus();
	await expect(button).toBeFocused();
	await page.setViewportSize({ width: 900, height: 900 });
	await expect(button).toBeVisible();
	await expect(button.locator('span')).toBeHidden();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(button).toBeHidden();
});
