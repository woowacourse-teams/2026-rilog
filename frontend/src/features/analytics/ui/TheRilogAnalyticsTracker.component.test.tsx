import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureAnalyticsEvent } from '@/shared/analytics/posthog';

import TheRilogAnalyticsTracker from './TheRilogAnalyticsTracker';

vi.mock('@/shared/analytics/posthog', () => ({ captureAnalyticsEvent: vi.fn() }));
const capture = vi.mocked(captureAnalyticsEvent);
const events = (name: string) => capture.mock.calls.filter(([event]) => event === name);
const advance = (ms: number) =>
	act(() => {
		vi.advanceTimersByTime(ms);
	});
const setVisibility = (state: DocumentVisibilityState) => {
	Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
	act(() => {
		document.dispatchEvent(new Event('visibilitychange'));
	});
};

describe('TheRilogAnalyticsTracker', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		capture.mockClear();
		Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
	});
	afterEach(() => {
		vi.useRealTimers();
		Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
	});

	it('Strict Mode와 재렌더링에서도 방문과 최초 0초를 한 번만 전송한다', () => {
		const view = render(
			<StrictMode>
				<TheRilogAnalyticsTracker>지면</TheRilogAnalyticsTracker>
			</StrictMode>,
		);
		view.rerender(
			<StrictMode>
				<TheRilogAnalyticsTracker>변경된 지면</TheRilogAnalyticsTracker>
			</StrictMode>,
		);
		expect(events('the rilog viewed')).toHaveLength(1);
		expect(events('the rilog engagement updated')).toHaveLength(1);
		expect(events('the rilog engagement updated')[0][1]).toEqual({
			the_rilog_visit_id: events('the rilog viewed')[0][1]?.the_rilog_visit_id,
			engagement_seconds: 0,
		});
	});

	it('탭이 숨겨진 시간은 제외하고 복귀 후 같은 방문의 15초 간격을 이어간다', () => {
		render(<TheRilogAnalyticsTracker>지면</TheRilogAnalyticsTracker>);
		advance(5_000);
		setVisibility('hidden');
		advance(60_000);
		expect(events('the rilog engagement updated')).toHaveLength(2);
		expect(events('the rilog engagement updated')[1]).toEqual([
			'the rilog engagement updated',
			{ the_rilog_visit_id: events('the rilog viewed')[0][1]?.the_rilog_visit_id, engagement_seconds: 5 },
			{ transport: 'sendBeacon' },
		]);
		setVisibility('visible');
		advance(10_000);
		expect(events('the rilog engagement updated')[2][1]?.engagement_seconds).toBe(15);
		expect(events('the rilog viewed')).toHaveLength(1);
	});

	it('숨김과 pagehide 및 unmount가 겹쳐도 같은 누적값을 중복 전송하지 않는다', () => {
		const view = render(<TheRilogAnalyticsTracker>지면</TheRilogAnalyticsTracker>);
		advance(8_000);
		setVisibility('hidden');
		act(() => {
			window.dispatchEvent(new PageTransitionEvent('pagehide'));
		});
		view.unmount();
		expect(events('the rilog engagement updated').map(([, props]) => props?.engagement_seconds)).toEqual([0, 8]);
	});

	it('브라우저 뒤로 가기로 복원하면 새 방문 ID와 0초부터 기록한다', () => {
		render(<TheRilogAnalyticsTracker>지면</TheRilogAnalyticsTracker>);
		advance(9_000);
		act(() => {
			window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
		});
		advance(60_000);
		act(() => {
			window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		});
		advance(15_000);
		const views = events('the rilog viewed');
		expect(views).toHaveLength(2);
		expect(views[1][1]?.the_rilog_visit_id).not.toBe(views[0][1]?.the_rilog_visit_id);
		expect(events('the rilog engagement updated').map(([, props]) => props?.engagement_seconds)).toEqual([0, 9, 0, 15]);
	});

	it('15초 전 페이지를 떠나도 마지막 화면 표시 시간을 beacon으로 전송한다', () => {
		const view = render(<TheRilogAnalyticsTracker>지면</TheRilogAnalyticsTracker>);
		advance(7_000);
		view.unmount();
		expect(events('the rilog engagement updated')[1][1]?.engagement_seconds).toBe(7);
		expect(events('the rilog engagement updated')[1][2]).toEqual({ transport: 'sendBeacon' });
	});

	it('페이지를 떠난 뒤 다시 진입하면 새 방문으로 집계한다', () => {
		const view = render(<TheRilogAnalyticsTracker>지면</TheRilogAnalyticsTracker>);
		view.unmount();
		render(<TheRilogAnalyticsTracker>지면</TheRilogAnalyticsTracker>);
		const views = events('the rilog viewed');
		expect(views).toHaveLength(2);
		expect(views[1][1]?.the_rilog_visit_id).not.toBe(views[0][1]?.the_rilog_visit_id);
	});
});
