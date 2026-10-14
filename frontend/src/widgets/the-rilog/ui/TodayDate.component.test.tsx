import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TodayDate from './TodayDate';

describe('TodayDate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-04T14:59:59Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('서버 렌더링에서는 빌드 날짜를 고정하지 않고 날짜 자리를 제공한다', () => {
		const html = renderToString(<TodayDate />);
		expect(html).toContain('오늘 날짜');
		expect(html).not.toContain('2026-10-04');
		expect(html).not.toContain('Sunday');
	});

	it('UTC 날짜와 한국 날짜가 다르면 한국 날짜를 표시한다', () => {
		vi.setSystemTime(new Date('2026-10-04T15:30:00Z'));
		render(<TodayDate />);
		expect(screen.getByText('Monday october 5 2026')).toHaveAttribute('datetime', '2026-10-05');
	});

	it('페이지를 열어 둔 채 한국 자정을 지나면 다음 날짜를 표시한다', async () => {
		render(<TodayDate />);
		expect(screen.getByText('Sunday october 4 2026')).toHaveAttribute('datetime', '2026-10-04');
		await act(async () => vi.advanceTimersByTimeAsync(1000));
		expect(screen.getByText('Monday october 5 2026')).toHaveAttribute('datetime', '2026-10-05');
	});

	it.each(['focus', 'visibilitychange'])(
		'오래 비활성 상태였다가 %s 이벤트가 발생하면 날짜를 다시 계산한다',
		(event) => {
			render(<TodayDate />);
			vi.setSystemTime(new Date('2027-01-01T01:00:00Z'));
			if (event === 'focus') fireEvent.focus(window);
			else {
				vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
				fireEvent(document, new Event('visibilitychange'));
			}
			expect(screen.getByText('Friday january 1 2027')).toHaveAttribute('datetime', '2027-01-01');
		},
	);

	it('페이지에서 나가면 남은 자정 타이머를 정리한다', () => {
		const { unmount } = render(<TodayDate />);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
