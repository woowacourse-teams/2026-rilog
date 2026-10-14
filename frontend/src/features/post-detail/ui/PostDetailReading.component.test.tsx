import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { analytics } from '@/features/analytics/model/events';

import PostDetailContent from './PostDetailContent';

describe('게시글 읽기 진행 계측', () => {
	let articleTop: number;
	let articleHeight: number;
	let visibility: DocumentVisibilityState;
	let postId = 1000;

	const advance = (milliseconds: number) => {
		void act(() => vi.advanceTimersByTime(milliseconds));
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
	const snapshots = () => vi.mocked(analytics.postReadingProgress).mock.calls.map(([snapshot]) => snapshot);
	const states = () =>
		snapshots().map(({ engagementSeconds, hasReached50Percent }) => [engagementSeconds, hasReached50Percent]);

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
		vi.spyOn(analytics, 'postReadingProgress').mockImplementation(() => undefined);
	});

	afterEach(() => {
		cleanup();
		advance(0);
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('5초에 절반에 도달한 방문은 20초 전에 기록되고 30초까지 누적 시간이 갱신된다', () => {
		render(content());
		advance(5000);
		showDepth();
		expect(analytics.postReadEngaged).toHaveBeenCalledExactlyOnceWith({
			postId,
			engagementSeconds: 5,
			scrollDepthBucket: '50_percent',
		});
		advance(25000);
		expect(states()).toEqual([
			[5, true],
			[10, true],
			[20, true],
			[30, true],
		]);
		expect(new Set(snapshots().map(({ readingVisitId }) => readingVisitId)).size).toBe(1);
		expect(snapshots()[0].readingVisitId).not.toBe('');
	});

	it('절반에 도달하지 않은 방문도 10초 간격으로 false와 누적 시간을 기록한다', () => {
		render(content());
		advance(30000);
		expect(states()).toEqual([
			[10, false],
			[20, false],
			[30, false],
		]);
		expect(analytics.postReadEngaged).not.toHaveBeenCalled();
	});

	it('20초 후 절반에 처음 도달하면 현재 시간과 true를 추가하고 위로 스크롤해도 이력을 유지한다', () => {
		render(content());
		advance(23500);
		showDepth();
		showDepth(900);
		advance(6500);
		expect(states()).toEqual([
			[10, false],
			[20, false],
			[23.5, true],
			[30, true],
		]);
		expect(analytics.postReadEngaged).toHaveBeenCalledTimes(1);
	});

	it('숨길 때 마지막 상태를 기록하고 숨김 60초를 제외한 채 같은 방문을 이어간다', () => {
		render(content());
		advance(5000);
		showDepth();
		advance(10000);
		setVisibility('hidden');
		const visitId = snapshots()[0].readingVisitId;
		expect(snapshots().at(-1)).toMatchObject({
			readingVisitId: visitId,
			engagementSeconds: 15,
			hasReached50Percent: true,
		});
		expect(analytics.postReadingProgress).toHaveBeenLastCalledWith(expect.any(Object), true);
		advance(60000);
		expect(snapshots()).toHaveLength(3);
		setVisibility('visible');
		advance(5000);
		expect(snapshots().at(-1)).toMatchObject({
			readingVisitId: visitId,
			engagementSeconds: 20,
			hasReached50Percent: true,
		});
	});

	it('처음부터 절반이 보이는 짧은 글도 10초 전에 true 상태를 기록한다', () => {
		articleTop = 0;
		articleHeight = 400;
		render(content());
		advance(10000);
		expect(states()).toEqual([
			[0, true],
			[10, true],
		]);
	});

	it('숨겨진 문서의 스크롤은 깊이 이력이나 기존 이벤트를 만들지 않는다', () => {
		visibility = 'hidden';
		render(content());
		advance(60000);
		showDepth();
		expect(snapshots()).toEqual([]);
		expect(analytics.postReadEngaged).not.toHaveBeenCalled();
		articleTop = 900;
		setVisibility('visible');
		advance(10000);
		expect(snapshots().at(-1)).toMatchObject({ engagementSeconds: 10, hasReached50Percent: false });
		showDepth();
		expect(snapshots().at(-1)).toMatchObject({ engagementSeconds: 10, hasReached50Percent: true });
	});

	it('A에서 B로 이동한 뒤 A에 재방문하면 시간, 깊이 이력과 방문 ID를 초기화한다', () => {
		const view = render(content());
		showDepth();
		advance(10000);
		const firstVisitId = snapshots()[0].readingVisitId;
		articleTop = 900;
		view.rerender(content(postId + 100));
		advance(10000);
		const secondVisit = snapshots().find(({ postId: id }) => id === postId + 100);
		expect(secondVisit).toMatchObject({ engagementSeconds: 10, hasReached50Percent: false });
		expect(secondVisit?.readingVisitId).not.toBe(firstVisitId);
		view.rerender(content());
		advance(10000);
		const returnVisit = snapshots().find(
			({ postId: id, readingVisitId }) => id === postId && readingVisitId !== firstVisitId,
		);
		expect(returnVisit).toMatchObject({ engagementSeconds: 10, hasReached50Percent: false });
		expect(returnVisit?.readingVisitId).not.toBe(secondVisit?.readingVisitId);
	});

	it('실제 언마운트 후 같은 글로 돌아오면 새 방문 ID와 0초부터 시작한다', () => {
		const first = render(content());
		showDepth();
		advance(10000);
		const firstVisitId = snapshots()[0].readingVisitId;
		first.unmount();
		advance(0);
		articleTop = 900;
		render(content());
		advance(10000);
		const returnVisit = snapshots().find(({ readingVisitId }) => readingVisitId !== firstVisitId);
		expect(returnVisit).toMatchObject({ postId, engagementSeconds: 10, hasReached50Percent: false });
	});

	it('StrictMode와 같은 글 재렌더링, 반복 스크롤·리사이즈는 방문을 나누거나 같은 상태를 재전송하지 않는다', () => {
		const view = render(<StrictMode>{content()}</StrictMode>);
		advance(5000);
		showDepth();
		const visitId = snapshots()[0].readingVisitId;
		showDepth();
		fireEvent.resize(window);
		view.rerender(<StrictMode>{content()}</StrictMode>);
		advance(15000);
		showDepth();
		fireEvent.resize(window);
		expect(snapshots().map(({ engagementSeconds }) => engagementSeconds)).toEqual([5, 10, 20]);
		expect(snapshots().every(({ readingVisitId }) => readingVisitId === visitId)).toBe(true);
		expect(analytics.postReadEngaged).toHaveBeenCalledTimes(1);
		expect(analytics.postDetailViewed).toHaveBeenCalledTimes(1);
	});

	it('pagehide와 실제 언마운트는 마지막 상태를 시도하되 같은 상태를 두 번 보내지 않고 리스너를 정리한다', () => {
		const view = render(content());
		advance(3500);
		fireEvent(window, new Event('pagehide'));
		expect(snapshots()).toEqual([
			expect.objectContaining({ postId, engagementSeconds: 3.5, hasReached50Percent: false }),
		]);
		expect(analytics.postReadingProgress).toHaveBeenCalledWith(expect.any(Object), true);
		fireEvent(window, new Event('pagehide'));
		expect(snapshots()).toHaveLength(1);
		view.unmount();
		advance(0);
		expect(snapshots()).toHaveLength(1);
		expect(vi.getTimerCount()).toBe(0);
		fireEvent.scroll(window);
		fireEvent.resize(window);
		advance(10000);
		expect(snapshots()).toHaveLength(1);
	});

	it('pagehide 후 pageshow로 같은 컴포넌트가 복귀해도 새 방문 ID와 0초부터 센다', () => {
		render(content());
		showDepth();
		advance(5000);
		const firstVisitId = snapshots()[0].readingVisitId;
		fireEvent(window, new Event('pagehide'));
		advance(60000);
		expect(
			snapshots()
				.filter(({ readingVisitId }) => readingVisitId === firstVisitId)
				.at(-1)?.engagementSeconds,
		).toBe(5);
		articleTop = 900;
		fireEvent(window, new Event('pageshow'));
		advance(10000);
		expect(
			snapshots()
				.filter(({ readingVisitId }) => readingVisitId === firstVisitId)
				.at(-1)?.engagementSeconds,
		).toBe(5);
		const returnVisit = snapshots().find(({ readingVisitId }) => readingVisitId !== firstVisitId);
		expect(returnVisit).toMatchObject({ postId, engagementSeconds: 10, hasReached50Percent: false });
	});

	it('방문별 최대 시간과 true 이력으로 10초·20초·30초 기준을 계산할 수 있다', () => {
		const view = render(content());
		advance(5000);
		showDepth();
		advance(22000);
		articleTop = 900;
		view.rerender(content(postId + 100));
		advance(30000);
		view.unmount();
		advance(0);
		const visitIds = [...new Set(snapshots().map(({ readingVisitId }) => readingVisitId))];
		const qualifiesAt = (visitId: string) => {
			const visit = snapshots().filter(({ readingVisitId }) => readingVisitId === visitId);
			const maxSeconds = Math.max(...visit.map(({ engagementSeconds }) => engagementSeconds));
			const hasReachedDepth = visit.some(({ hasReached50Percent }) => hasReached50Percent);
			return [10, 20, 30].map((seconds) => hasReachedDepth && maxSeconds >= seconds);
		};
		expect(visitIds).toHaveLength(2);
		expect(qualifiesAt(visitIds[0])).toEqual([true, true, false]);
		expect(qualifiesAt(visitIds[1])).toEqual([false, false, false]);
	});
});
