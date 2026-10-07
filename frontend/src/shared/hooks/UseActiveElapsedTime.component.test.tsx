import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useActiveElapsedTime } from './use-active-elapsed-time';

function ActiveElapsedTimeProbe() {
	const getActiveElapsedTime = useActiveElapsedTime();
	const [elapsedTime, setElapsedTime] = useState(0);

	return <button onClick={() => setElapsedTime(getActiveElapsedTime())}>{elapsedTime}</button>;
}

function IntervalProbe({ resetKey, onInterval }: { resetKey: number; onInterval: (ms: number) => void }) {
	useActiveElapsedTime(resetKey, { intervalMs: 10000, onInterval });
	return null;
}

describe('useActiveElapsedTime', () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('주기 전송 옵션 없이 사용하면 타이머를 만들지 않는다', () => {
		vi.useFakeTimers();
		render(<ActiveElapsedTimeProbe />);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('같은 키에서 callback이 바뀌어도 누적 주기를 유지하고 최신 callback에 알린다', () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		const previousCallback = vi.fn();
		const nextCallback = vi.fn();
		const view = render(<IntervalProbe resetKey={1} onInterval={previousCallback} />);
		void act(() => vi.advanceTimersByTime(10000));
		expect(previousCallback).toHaveBeenCalledExactlyOnceWith(10000);
		void act(() => vi.advanceTimersByTime(5000));
		view.rerender(<IntervalProbe resetKey={1} onInterval={nextCallback} />);
		void act(() => vi.advanceTimersByTime(5000));
		expect(previousCallback).toHaveBeenCalledTimes(1);
		expect(nextCallback).toHaveBeenCalledExactlyOnceWith(20000);
	});

	it('키가 바뀌면 이전 주기 타이머를 취소하고 새 키에서 10초를 기다린다', () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		const callback = vi.fn();
		const view = render(<IntervalProbe resetKey={1} onInterval={callback} />);
		void act(() => vi.advanceTimersByTime(5000));
		view.rerender(<IntervalProbe resetKey={2} onInterval={callback} />);
		void act(() => vi.advanceTimersByTime(9999));
		expect(callback).not.toHaveBeenCalled();
		void act(() => vi.advanceTimersByTime(1));
		expect(callback).toHaveBeenCalledExactlyOnceWith(10000);
	});

	it('언마운트하면 주기 타이머와 가시성 리스너를 정리한다', () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		const callback = vi.fn();
		const view = render(<IntervalProbe resetKey={1} onInterval={callback} />);
		view.unmount();
		expect(vi.getTimerCount()).toBe(0);
		fireEvent(document, new Event('visibilitychange'));
		expect(vi.getTimerCount()).toBe(0);
		void act(() => vi.advanceTimersByTime(20000));
		expect(callback).not.toHaveBeenCalled();
	});

	it('숨겨진 시간에는 주기를 전송하지 않고 복귀 후 남은 가시시간부터 이어간다', () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		let visibility: DocumentVisibilityState = 'visible';
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
		const callback = vi.fn();
		render(<IntervalProbe resetKey={1} onInterval={callback} />);
		void act(() => vi.advanceTimersByTime(5000));
		visibility = 'hidden';
		fireEvent(document, new Event('visibilitychange'));
		void act(() => vi.advanceTimersByTime(60000));
		expect(callback).not.toHaveBeenCalled();
		visibility = 'visible';
		fireEvent(document, new Event('visibilitychange'));
		void act(() => vi.advanceTimersByTime(5000));
		expect(callback).toHaveBeenCalledExactlyOnceWith(10000);
	});

	it('pagehide와 pageshow 사이의 시간은 visibilitychange가 없어도 제외한다', () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		const callback = vi.fn();
		render(<IntervalProbe resetKey={1} onInterval={callback} />);
		void act(() => vi.advanceTimersByTime(5000));
		fireEvent(window, new Event('pagehide'));
		void act(() => vi.advanceTimersByTime(60000));
		expect(callback).not.toHaveBeenCalled();
		fireEvent(window, new Event('pageshow'));
		void act(() => vi.advanceTimersByTime(5000));
		expect(callback).toHaveBeenCalledExactlyOnceWith(10000);
	});

	it('탭이 숨겨진 구간을 경과 시간에서 제외한다', () => {
		let currentTime = 1_000;
		let visibilityState: DocumentVisibilityState = 'visible';
		vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);

		render(<ActiveElapsedTimeProbe />);

		currentTime = 2_000;
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('button')).toHaveTextContent('1000');

		visibilityState = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));
		currentTime = 122_000;
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('button')).toHaveTextContent('1000');

		visibilityState = 'visible';
		document.dispatchEvent(new Event('visibilitychange'));
		currentTime = 125_000;
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('button')).toHaveTextContent('4000');
	});
});
