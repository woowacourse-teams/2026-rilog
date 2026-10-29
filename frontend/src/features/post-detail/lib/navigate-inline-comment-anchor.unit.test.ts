// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { navigateInlineCommentAnchor } from './navigate-inline-comment-anchor';

describe('navigateInlineCommentAnchor 스크롤 소유권', () => {
	let target: HTMLElement;
	let frames: Map<number, FrameRequestCallback>;
	let frameId: number;
	let scrollTo: ReturnType<typeof vi.spyOn>;
	const flushFrame = (time: number) => {
		const callbacks = [...frames.values()];
		frames.clear();
		callbacks.forEach((callback) => callback(time));
	};

	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(performance, 'now').mockReturnValue(0);
		vi.stubGlobal('innerHeight', 800);
		vi.stubGlobal('scrollY', 0);
		vi.stubGlobal('scrollX', 0);
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: false })),
		);
		Object.defineProperty(document, 'scrollingElement', { configurable: true, value: document.documentElement });
		vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2400);
		vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);
		frames = new Map();
		frameId = 0;
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			const id = ++frameId;
			frames.set(id, callback);
			return id;
		});
		vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => frames.delete(id));
		scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
		target = document.createElement('p');
		document.body.append(target);
		vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() =>
			window.scrollY === 0 ? new DOMRect(0, 790, 100, 30) : new DOMRect(0, 300, 100, 30),
		);
	});

	afterEach(() => {
		target.remove();
		window.history.replaceState(null, '', '/');
		Reflect.deleteProperty(document, 'scrollingElement');
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('이동을 취소하면 이미 진행된 위치에서 다음 프레임의 스크롤을 멈춘다', () => {
		const cancel = navigateInlineCommentAnchor(target, () => []);
		flushFrame(100);
		expect(scrollTo).toHaveBeenCalledTimes(1);
		expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'instant' }));
		cancel();
		cancel();
		flushFrame(200);
		expect(scrollTo).toHaveBeenCalledTimes(1);
	});

	it('첫 이동 프레임 전에 취소하면 스크롤하지 않는다', () => {
		const cancel = navigateInlineCommentAnchor(target, () => []);
		cancel();
		flushFrame(100);
		expect(scrollTo).not.toHaveBeenCalled();
	});

	it.each(['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'] as const)(
		'이동 중 사용자의 %s 입력 이후에는 스크롤을 제어하지 않는다',
		(eventName) => {
			const cancel = navigateInlineCommentAnchor(target, () => []);
			flushFrame(100);
			window.dispatchEvent(
				eventName === 'keydown' ? new KeyboardEvent('keydown', { key: 'PageDown' }) : new Event(eventName),
			);
			flushFrame(200);
			cancel();
			expect(scrollTo).toHaveBeenCalledTimes(1);
		},
	);

	it('스크롤 키가 아닌 키보드 입력은 진행 중인 이동을 취소하지 않는다', () => {
		const cancel = navigateInlineCommentAnchor(target, () => []);
		flushFrame(100);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
		flushFrame(200);
		expect(scrollTo).toHaveBeenCalledTimes(2);
		cancel();
	});

	it('새 본문 이동은 이전 이동을 취소하고 이전 정리 함수가 새 이동을 막지 않는다', () => {
		const cancel = navigateInlineCommentAnchor(target, () => []);
		flushFrame(100);
		const cancelNext = navigateInlineCommentAnchor(target, () => []);
		cancel();
		flushFrame(200);
		expect(scrollTo).toHaveBeenCalledTimes(2);
		cancelNext();
	});

	it('같은 게시글의 selectionId가 바뀌어도 진행 중인 이동을 유지한다', () => {
		const cancel = navigateInlineCommentAnchor(target, () => []);
		window.history.replaceState(null, '', '/?selectionId=91');
		flushFrame(100);
		expect(scrollTo).toHaveBeenCalledTimes(1);
		cancel();
	});

	it.each(['route', 'detached'] as const)('%s 상태가 되면 이전 본문으로 스크롤하지 않는다', (change) => {
		const cancel = navigateInlineCommentAnchor(target, () => []);
		if (change === 'route') window.history.replaceState(null, '', '/different-post');
		else target.remove();
		flushFrame(100);
		cancel();
		expect(scrollTo).not.toHaveBeenCalled();
	});

	it.each(['pagehide', 'visibilitychange'] as const)(
		'%s로 페이지가 보이지 않으면 진행 중인 이동을 멈춘다',
		(eventName) => {
			const cancel = navigateInlineCommentAnchor(target, () => []);
			flushFrame(100);
			if (eventName === 'visibilitychange') {
				vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
				document.dispatchEvent(new Event(eventName));
			} else window.dispatchEvent(new Event(eventName));
			flushFrame(200);
			cancel();
			expect(scrollTo).toHaveBeenCalledTimes(1);
		},
	);

	it('동작 줄이기 설정에서는 목표 위치로 즉시 이동한다', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const cancel = navigateInlineCommentAnchor(target, () => []);
		expect(scrollTo).toHaveBeenCalledTimes(1);
		expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'instant' }));
		cancel();
	});

	it('목표에 도착한 뒤 강조 정리는 이후 사용자 스크롤을 중단하지 않는다', () => {
		const cancel = navigateInlineCommentAnchor(target, () => []);
		flushFrame(400);
		vi.stubGlobal('scrollY', 100);
		for (let time = 416; time <= 480; time += 16) flushFrame(time);
		cancel();
		flushFrame(496);
		expect(scrollTo).toHaveBeenCalledTimes(1);
	});
});
