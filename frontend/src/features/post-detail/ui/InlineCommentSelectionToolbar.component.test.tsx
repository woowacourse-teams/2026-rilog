import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';

import InlineCommentSelectionToolbar from './InlineCommentSelectionToolbar';

describe('InlineCommentSelectionToolbar', () => {
	let article: HTMLElement;
	let isMobile = false;

	beforeEach(() => {
		isMobile = false;
		vi.stubGlobal(
			'matchMedia',
			vi.fn((query: string) => ({
				matches: query.includes('min-width') ? !isMobile : isMobile,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
		Object.defineProperty(Range.prototype, 'getClientRects', {
			configurable: true,
			value: () => [new DOMRect(100, 100, 160, 24)],
		});
		article = document.createElement('article');
		article.innerHTML =
			'<p data-inline-comment-root data-inline-comment-block-id="block-1">첫 번째 인용문</p><p data-inline-comment-root data-inline-comment-block-id="block-2">다른 블록</p>';
		document.body.append(article);
	});

	afterEach(() => {
		article.remove();
		window.getSelection()?.removeAllRanges();
		Reflect.deleteProperty(Range.prototype, 'getClientRects');
		vi.unstubAllGlobals();
	});

	const select = (acrossBlocks = false) => {
		const range = document.createRange();
		range.setStart(article.children[0].firstChild!, 0);
		range.setEnd(article.children[acrossBlocks ? 1 : 0].firstChild!, 3);
		act(() => {
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
			fireEvent(document, new Event('selectionchange'));
		});
	};
	const renderToolbar = (isAuthenticated = true, isInitialized = true) =>
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated, isInitialized, isOnboarding: false }}>
				<InlineCommentSelectionToolbar article={article} postId={81} onCreateComment={vi.fn()} />
			</AUTH_CONTEXT.Provider>,
		);

	it('선택 위치의 버튼을 누르면 DOM Range 없이 선택 정보를 전달한다', async () => {
		const onCreateComment = vi.fn();
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
				<InlineCommentSelectionToolbar article={article} postId={81} onCreateComment={onCreateComment} />
			</AUTH_CONTEXT.Provider>,
		);
		select();
		await userEvent.click(screen.getByRole('button', { name: '댓글 추가' }));
		expect(onCreateComment).toHaveBeenCalledWith({
			blockId: 'block-1',
			startOffset: 0,
			endOffset: 3,
			selectedText: '첫 번',
		});
		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
	});

	it('블록을 가로지르거나 선택을 해제하면 버튼을 숨긴다', () => {
		renderToolbar();
		select(true);
		expect(screen.queryByRole('button', { name: '댓글 추가' })).not.toBeInTheDocument();
		select();
		expect(screen.getByRole('button', { name: '댓글 추가' })).toBeVisible();
		act(() => {
			window.getSelection()?.removeAllRanges();
			fireEvent(document, new Event('selectionchange'));
		});
		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
	});

	it('본문 밖에서 시작한 드래그가 본문 텍스트를 포함하면 버튼을 표시한다', () => {
		const outside = document.createElement('span');
		outside.textContent = '바깥 영역';
		article.before(outside);
		const rootText = article.querySelector('[data-inline-comment-root]')!.firstChild!;
		const range = document.createRange();
		range.setStart(outside.firstChild!, 0);
		range.setEnd(rootText, 3);
		renderToolbar();

		act(() => {
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
			fireEvent(document, new Event('selectionchange'));
		});

		expect(screen.getByRole('button', { name: '댓글 추가' })).toBeVisible();
		outside.remove();
	});

	it.each([
		{ isAuthenticated: false, isInitialized: true },
		{ isAuthenticated: false, isInitialized: false },
	])('로그인하지 않은 사용자의 선택에는 댓글 추가 버튼을 표시하지 않는다: %j', (auth) => {
		renderToolbar(auth.isAuthenticated, auth.isInitialized);
		select();
		expect(screen.queryByRole('button', { name: '댓글 추가' })).not.toBeInTheDocument();
	});

	it('모바일에서는 선택 버튼을 표시하지 않는다', () => {
		isMobile = true;
		renderToolbar();
		select();
		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
	});

	it('키보드로 활성화하고 Escape로 닫을 수 있다', async () => {
		const user = userEvent.setup();
		const onCreateComment = vi.fn();
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
				<InlineCommentSelectionToolbar article={article} postId={81} onCreateComment={onCreateComment} />
			</AUTH_CONTEXT.Provider>,
		);
		select();
		await user.tab();
		expect(screen.getByRole('button', { name: '댓글 추가' })).toHaveFocus();
		await user.keyboard('{Enter}');
		expect(onCreateComment).toHaveBeenCalledTimes(1);
		select();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
	});
});
