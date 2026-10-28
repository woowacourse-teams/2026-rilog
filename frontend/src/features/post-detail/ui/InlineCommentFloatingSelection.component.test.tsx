import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InlineCommentFloatingSelection from './InlineCommentFloatingSelection';

describe('InlineCommentFloatingSelection', () => {
	let article: HTMLElement;
	const onCreateComment = vi.fn();
	const scrollTo = vi.fn();

	beforeEach(() => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
		);
		onCreateComment.mockReset();
		scrollTo.mockReset();
		vi.stubGlobal('scrollTo', scrollTo);
		article = document.createElement('article');
		article.innerHTML =
			'<p data-inline-comment-root data-inline-comment-block-id="first">앞 😀댓글 뒤</p><p data-inline-comment-root data-inline-comment-block-id="second">다른 문단</p>';
		document.body.append(article);
		Object.defineProperty(Range.prototype, 'getClientRects', {
			configurable: true,
			value: () => [new DOMRect(10, 100, 100, 20)],
		});
	});

	afterEach(() => {
		cleanup();
		article.remove();
		window.getSelection()?.removeAllRanges();
		Reflect.deleteProperty(Range.prototype, 'getClientRects');
		Reflect.deleteProperty(document, 'caretPositionFromPoint');
		document.body.style.position = '';
		document.documentElement.style.overflow = '';
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	function Harness() {
		const [isActive, setIsActive] = useState(false);
		return (
			<InlineCommentFloatingSelection
				article={article}
				isActive={isActive}
				onActiveChange={setIsActive}
				onCreateComment={(selection) => {
					onCreateComment(selection);
					setIsActive(false);
				}}
			/>
		);
	}

	const select = (start: number, end: number, crossBlock = false) => {
		const range = document.createRange();
		range.setStart(article.children[0].firstChild!, start);
		range.setEnd(article.children[crossBlock ? 1 : 0].firstChild!, end);
		act(() => {
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
			fireEvent(document, new Event('selectionchange'));
		});
	};

	it('선택 모드에서 유효한 텍스트를 선택하면 UTF-16 범위를 확정한다', async () => {
		render(<Harness />);
		await userEvent.click(screen.getByRole('button', { name: '댓글 작성' }));
		expect(screen.getByRole('region', { name: '댓글 선택 모드' })).toBeVisible();
		expect(screen.getByRole('status')).toHaveTextContent('댓글을 남길 부분을 드래그하세요');
		expect(screen.queryByRole('button', { name: '댓글 쓰기' })).not.toBeInTheDocument();
		select(2, 6);
		expect(screen.getByRole('button', { name: '댓글 쓰기' })).toHaveTextContent('댓글 쓰기');
		expect(screen.getByRole('status')).toHaveTextContent('댓글을 남길 부분을 드래그하세요');
		expect(screen.getByRole('button', { name: '선택 취소' })).toHaveTextContent('취소');
		await userEvent.click(screen.getByRole('button', { name: '댓글 쓰기' }));
		expect(onCreateComment).toHaveBeenCalledWith({
			blockId: 'first',
			startOffset: 2,
			endOffset: 6,
			selectedText: '😀댓글',
		});
		expect(screen.getByRole('button', { name: '댓글 작성' })).toBeVisible();
	});

	it('여러 문단 선택은 확정할 수 없고 취소 후 다시 선택할 수 있다', async () => {
		render(<Harness />);
		await userEvent.click(screen.getByRole('button', { name: '댓글 작성' }));
		select(0, 2, true);
		expect(screen.queryByRole('button', { name: '댓글 쓰기' })).not.toBeInTheDocument();
		await userEvent.click(screen.getByRole('button', { name: '선택 취소' }));
		await userEvent.click(screen.getByRole('button', { name: '댓글 작성' }));
		expect(screen.queryByRole('button', { name: '댓글 쓰기' })).not.toBeInTheDocument();
	});

	it('선택 중 링크 실행을 막고 Escape로 종료하면 링크를 다시 사용할 수 있다', async () => {
		article.children[0].innerHTML = '<a href="#target">링크</a>';
		const link = article.querySelector('a')!;
		render(<Harness />);
		await userEvent.click(screen.getByRole('button', { name: '댓글 작성' }));
		const selectingClick = new MouseEvent('click', { bubbles: true, cancelable: true });
		link.dispatchEvent(selectingClick);
		expect(selectingClick.defaultPrevented).toBe(true);
		await userEvent.keyboard('{Escape}');
		const readingClick = new MouseEvent('click', { bubbles: true, cancelable: true });
		link.dispatchEvent(readingClick);
		expect(readingClick.defaultPrevented).toBe(false);
	});
	it('손가락을 역방향으로 드래그하면 순서가 정규화된 범위를 확정한다', async () => {
		const root = article.children[0] as HTMLElement;
		vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 100, 100, 20));
		const caret = vi.fn((x: number) => ({ offsetNode: root.firstChild, offset: x < 50 ? 2 : 6 }));
		Object.defineProperty(document, 'caretPositionFromPoint', { configurable: true, value: caret });
		const pointer = (type: string, x: number, y: number) => {
			const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
			Object.defineProperty(event, 'pointerId', { value: 1 });
			fireEvent(root, event);
		};
		render(<Harness />);
		await userEvent.click(screen.getByRole('button', { name: '댓글 작성' }));
		select(2, 6);
		expect(screen.getByRole('button', { name: '댓글 쓰기' })).toBeVisible();
		pointer('pointerdown', 80, 110);
		expect(screen.queryByRole('button', { name: '댓글 쓰기' })).not.toBeInTheDocument();
		pointer('pointermove', 20, 110);
		expect(screen.queryByRole('button', { name: '댓글 쓰기' })).not.toBeInTheDocument();
		pointer('pointerup', 20, 110);
		await userEvent.click(screen.getByRole('button', { name: '댓글 쓰기' }));
		expect(onCreateComment).toHaveBeenCalledWith({
			blockId: 'first',
			startOffset: 2,
			endOffset: 6,
			selectedText: '😀댓글',
		});
	});

	it('취소하면 기존 문서 스크롤 스타일과 읽던 위치를 복원한다', async () => {
		document.body.style.position = 'relative';
		document.documentElement.style.overflow = 'clip';
		vi.stubGlobal('scrollY', 450);
		render(<Harness />);
		await userEvent.click(screen.getByRole('button', { name: '댓글 작성' }));
		await userEvent.click(screen.getByRole('button', { name: '선택 취소' }));
		expect(scrollTo).toHaveBeenCalledWith(0, 450);
		expect(document.body.style.position).toBe('relative');
		expect(document.documentElement.style.overflow).toBe('clip');
	});
});
