import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useActiveElapsedTime } from './use-active-elapsed-time';

function ActiveElapsedTimeProbe() {
	const getActiveElapsedTime = useActiveElapsedTime();
	const [elapsedTime, setElapsedTime] = useState(0);

	return <button onClick={() => setElapsedTime(getActiveElapsedTime())}>{elapsedTime}</button>;
}

function ThresholdProbe({
	resetKey,
	onThresholdReached,
}: {
	resetKey: number;
	onThresholdReached: (ms: number) => void;
}) {
	useActiveElapsedTime(resetKey, { thresholdMs: 20000, onThresholdReached });
	return null;
}

describe('useActiveElapsedTime', () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('임계값 옵션 없이 사용하면 타이머를 만들지 않는다', () => {
		vi.useFakeTimers();
		render(<ActiveElapsedTimeProbe />);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('같은 키에서 callback이 바뀌면 누적 시간을 유지하고 최신 callback에 한 번 알린다', () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		const previousCallback = vi.fn();
		const nextCallback = vi.fn();
		const view = render(<ThresholdProbe resetKey={1} onThresholdReached={previousCallback} />);
		void act(() => vi.advanceTimersByTime(15000));
		view.rerender(<ThresholdProbe resetKey={1} onThresholdReached={nextCallback} />);
		void act(() => vi.advanceTimersByTime(5000));
		expect(previousCallback).not.toHaveBeenCalled();
		expect(nextCallback).toHaveBeenCalledExactlyOnceWith(20000);
		void act(() => vi.advanceTimersByTime(20000));
		expect(nextCallback).toHaveBeenCalledTimes(1);
	});

	it('키가 바뀌면 이전 임계값 타이머를 취소하고 새 키에서 20초를 기다린다', () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		const callback = vi.fn();
		const view = render(<ThresholdProbe resetKey={1} onThresholdReached={callback} />);
		void act(() => vi.advanceTimersByTime(15000));
		view.rerender(<ThresholdProbe resetKey={2} onThresholdReached={callback} />);
		void act(() => vi.advanceTimersByTime(19999));
		expect(callback).not.toHaveBeenCalled();
		void act(() => vi.advanceTimersByTime(1));
		expect(callback).toHaveBeenCalledExactlyOnceWith(20000);
	});

	it('언마운트하면 임계값 타이머와 가시성 리스너를 정리한다', () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		const callback = vi.fn();
		const view = render(<ThresholdProbe resetKey={1} onThresholdReached={callback} />);
		view.unmount();
		expect(vi.getTimerCount()).toBe(0);
		fireEvent(document, new Event('visibilitychange'));
		expect(vi.getTimerCount()).toBe(0);
		void act(() => vi.advanceTimersByTime(20000));
		expect(callback).not.toHaveBeenCalled();
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
