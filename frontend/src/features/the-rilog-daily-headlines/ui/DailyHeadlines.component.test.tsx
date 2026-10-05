import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DailyHeadline } from '../model/daily-headline';

import DailyHeadlines from './DailyHeadlines';

const dailyHeadlines: DailyHeadline[] = Array.from({ length: 8 }, (_, index) => ({
	id: `headline-${index}`,
	title: `헤드라인 ${index + 1}`,
}));

let shouldReduceMotion = false;
const motionListeners = new Set<() => void>();
const advance = async (milliseconds: number) => {
	await act(async () => vi.advanceTimersByTimeAsync(milliseconds));
};
const setReducedMotion = (value: boolean) => {
	act(() => {
		shouldReduceMotion = value;
		motionListeners.forEach((listener) => listener());
	});
};
const currentHeadline = () => screen.getByRole('link', { current: true });

describe('DailyHeadlines', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
		shouldReduceMotion = false;
		motionListeners.clear();
		vi.stubGlobal('matchMedia', () => ({
			get matches() {
				return shouldReduceMotion;
			},
			addEventListener: (_event: string, listener: () => void) => motionListeners.add(listener),
			removeEventListener: (_event: string, listener: () => void) => motionListeners.delete(listener),
		}));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('모든 헤드라인이 한 게시글로 향하고 선택한 위치를 fragment로 구분한다', () => {
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		const region = screen.getByRole('region', { name: 'Daily Headlines' });
		expect(within(region).getAllByRole('listitem')).toHaveLength(8);
		for (const headline of dailyHeadlines) {
			const link = within(region).getByRole('link', { name: headline.title });
			expect(link).toHaveAttribute('href', `/the-rilog/daily-headlines#${headline.id}`);
			expect(link).toHaveAttribute('title', headline.title);
		}
	});

	it('2초마다 현재 헤드라인을 옮기고 마지막 다음에는 첫 항목을 강조한다', async () => {
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		for (const headline of dailyHeadlines) {
			expect(currentHeadline()).toHaveAccessibleName(headline.title);
			await advance(2000);
		}
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[0].title);
	});

	it('마우스로 가리킨 항목에서 멈추고 영역을 벗어난 뒤 다시 순환한다', async () => {
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		const second = screen.getByRole('link', { name: dailyHeadlines[1].title });
		fireEvent.mouseEnter(second);
		await advance(6000);
		expect(currentHeadline()).toBe(second);
		fireEvent.mouseLeave(screen.getByRole('region', { name: 'Daily Headlines' }), { relatedTarget: document.body });
		await advance(2000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[2].title);
	});

	it('키보드 초점이 목록 안에 있으면 멈추고 목록을 떠나면 순환한다', async () => {
		render(
			<>
				<DailyHeadlines dailyHeadlines={dailyHeadlines.slice(0, 2)} />
				<button>다른 영역</button>
			</>,
		);
		act(() => screen.getByRole('link', { name: dailyHeadlines[0].title }).focus());
		await advance(6000);
		expect(currentHeadline()).toHaveFocus();
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[0].title);
		act(() => screen.getByRole('link', { name: dailyHeadlines[1].title }).focus());
		await advance(6000);
		expect(currentHeadline()).toHaveFocus();
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[1].title);
		act(() => screen.getByRole('button', { name: '다른 영역' }).focus());
		await advance(2000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[0].title);
	});

	it('동작 축소 설정이면 자동 순환하지 않고 키보드로 항목을 선택할 수 있다', async () => {
		shouldReduceMotion = true;
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		await advance(6000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[0].title);
		act(() => screen.getByRole('link', { name: dailyHeadlines[1].title }).focus());
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[1].title);
	});

	it('페이지를 연 뒤 동작 축소 설정을 바꾸면 자동 순환을 중지하고 해제하면 재개한다', async () => {
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		await advance(2000);
		setReducedMotion(true);
		await advance(6000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[1].title);
		setReducedMotion(false);
		await advance(2000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[2].title);
	});

	it('순환 중 목록이 줄어들어도 존재하는 항목 하나를 현재 항목으로 제공한다', async () => {
		const { rerender } = render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		await advance(14000);
		rerender(<DailyHeadlines dailyHeadlines={dailyHeadlines.slice(0, 2)} />);
		expect(screen.getAllByRole('link', { current: true })).toHaveLength(1);
		expect(currentHeadline()).toHaveAttribute('href', expect.stringMatching(/headline-[01]$/));
	});

	it('헤드라인 하나만 있으면 현재 항목을 그대로 유지한다', async () => {
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines.slice(0, 1)} />);
		await advance(6000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[0].title);
	});

	it('빈 목록이면 헤드라인 영역을 표시하지 않는다', () => {
		render(<DailyHeadlines dailyHeadlines={[]} />);
		expect(screen.queryByRole('region', { name: 'Daily Headlines' })).not.toBeInTheDocument();
	});
});
