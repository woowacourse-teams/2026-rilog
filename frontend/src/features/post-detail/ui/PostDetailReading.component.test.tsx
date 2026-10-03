import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { analytics } from '@/features/analytics/model/events';

import PostDetailContent from './PostDetailContent';

describe('게시글 읽기 계측', () => {
	let articleTop: number;
	let articleHeight: number;
	let visibility: DocumentVisibilityState;
	let postId = 1000;

	const advance = (milliseconds: number) => {
		void act(() => {
			vi.advanceTimersByTime(milliseconds);
		});
	};
	const showDepth = (top = 100) => {
		articleTop = top;
		fireEvent.scroll(window);
	};
	const setVisibility = (next: DocumentVisibilityState) => {
		visibility = next;
		fireEvent(document, new Event('visibilitychange'));
	};
	const content = (id = postId) => (
		<PostDetailContent html="<p>읽기 본문</p>" postId={id} ownerType="RILOG" category="TECH" />
	);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		postId += 1;
		articleTop = 900;
		articleHeight = 1200;
		visibility = 'visible';
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
		vi.stubGlobal('innerHeight', 700);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
			return {
				x: 0,
				y: articleTop,
				top: articleTop,
				bottom: articleTop + articleHeight,
				left: 0,
				right: 800,
				width: 800,
				height: this.tagName === 'ARTICLE' ? articleHeight : 0,
				toJSON: () => ({}),
			};
		});
		vi.spyOn(analytics, 'postDetailViewed').mockImplementation(() => undefined);
		vi.spyOn(analytics, 'postReadEngaged').mockImplementation(() => undefined);
		vi.spyOn(analytics, 'postReadQualified').mockImplementation(() => undefined);
	});

	afterEach(() => {
		cleanup();
		advance(0);
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('5초에 50%에 도달하면 스크롤 없이 누적 20초에 한 번 전송한다', () => {
		render(content());
		advance(5000);
		showDepth();
		expect(analytics.postReadEngaged).toHaveBeenCalledExactlyOnceWith({
			postId,
			engagementSeconds: 5,
			scrollDepthBucket: '50_percent',
		});
		advance(14999);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		advance(1);
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 20 });
	});

	it('20초 이후 50%에 도달하면 그 순간의 실제 누적 시간을 전송한다', () => {
		render(content());
		advance(23500);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		showDepth();
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 23.5 });
	});

	it('20초 이상 머물러도 50%에 도달하지 않으면 전송하지 않는다', () => {
		render(content());
		advance(60000);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
	});

	it('보이는 10초와 복귀 후 10초를 합산하고 숨겨진 60초는 제외한다', () => {
		render(content());
		showDepth();
		advance(10000);
		setVisibility('hidden');
		advance(60000);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		setVisibility('visible');
		advance(9999);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		advance(1);
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 20 });
	});

	it('50% 도달 후 위로 스크롤해도 도달 이력을 유지한다', () => {
		render(content());
		advance(5000);
		showDepth();
		showDepth(900);
		advance(15000);
		expect(analytics.postReadQualified).toHaveBeenCalledTimes(1);
	});

	it('처음부터 50%가 보이는 짧은 글도 20초를 기다린다', () => {
		articleTop = 0;
		articleHeight = 400;
		render(content());
		advance(19999);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		advance(1);
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 20 });
	});

	it('다른 글로 이동하면 이전 글의 시간과 도달 이력을 초기화한다', () => {
		const view = render(content());
		showDepth();
		advance(15000);
		articleTop = 900;
		view.rerender(content(postId + 100));
		advance(20000);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		showDepth();
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({
			postId: postId + 100,
			engagementSeconds: 20,
		});
	});

	it('StrictMode와 재렌더링 및 반복 스크롤과 리사이즈에서 중복 전송하지 않는다', () => {
		const view = render(<StrictMode>{content()}</StrictMode>);
		advance(5000);
		showDepth();
		view.rerender(<StrictMode>{content()}</StrictMode>);
		advance(15000);
		showDepth();
		fireEvent.resize(window);
		view.rerender(<StrictMode>{content()}</StrictMode>);
		advance(20000);
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 20 });
		expect(analytics.postReadEngaged).toHaveBeenCalledTimes(1);
		expect(analytics.postDetailViewed).toHaveBeenCalledTimes(1);
	});

	it('A를 10초 읽고 B를 거쳐 돌아오면 이전 시간 없이 0초부터 다시 계측한다', () => {
		const view = render(content());
		showDepth();
		advance(10000);
		view.rerender(content(postId + 100));
		view.rerender(content());
		showDepth();
		advance(10000);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		advance(9999);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		advance(1);
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 20 });
	});

	it('10초 읽다가 이탈한 글을 실제 재마운트하면 시간과 도달 이력을 초기화한다', () => {
		const first = render(content());
		showDepth();
		advance(10000);
		first.unmount();
		articleTop = 900;
		const second = render(content());
		advance(20000);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		showDepth();
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 20 });

		second.unmount();
		render(content());
		advance(10000);
		expect(analytics.postReadQualified).toHaveBeenCalledTimes(1);
		advance(9999);
		expect(analytics.postReadQualified).toHaveBeenCalledTimes(1);
		advance(1);
		expect(analytics.postReadQualified).toHaveBeenLastCalledWith({ postId, engagementSeconds: 20 });
		expect(analytics.postReadQualified).toHaveBeenCalledTimes(2);
	});

	it('숨겨진 문서의 스크롤은 도달 이력이나 이벤트를 만들지 않는다', () => {
		render(content());
		advance(20000);
		setVisibility('hidden');
		showDepth();
		fireEvent.resize(window);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		expect(analytics.postReadEngaged).not.toHaveBeenCalled();
		articleTop = 900;
		setVisibility('visible');
		advance(1000);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		showDepth();
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 21 });
	});

	it('숨겨진 상태로 처음 표시된 짧은 글은 복귀 후 보이는 20초를 기다린다', () => {
		visibility = 'hidden';
		articleTop = 0;
		articleHeight = 400;
		render(content());
		advance(60000);
		expect(analytics.postReadEngaged).not.toHaveBeenCalled();
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
		setVisibility('visible');
		advance(20000);
		expect(analytics.postReadQualified).toHaveBeenCalledExactlyOnceWith({ postId, engagementSeconds: 20 });
	});

	it('20초 전 이탈하면 타이머와 리스너를 정리하고 이후 이벤트를 만들지 않는다', () => {
		const view = render(content());
		showDepth();
		advance(19999);
		view.unmount();
		advance(0);
		expect(vi.getTimerCount()).toBe(0);
		setVisibility('hidden');
		setVisibility('visible');
		showDepth();
		fireEvent.resize(window);
		advance(20000);
		expect(analytics.postReadQualified).not.toHaveBeenCalled();
	});
});
