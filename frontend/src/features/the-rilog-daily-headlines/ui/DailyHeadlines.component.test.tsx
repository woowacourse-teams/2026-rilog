import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DailyHeadline } from '../model/daily-headline';

import DailyHeadlines from './DailyHeadlines';

const dailyHeadlines: DailyHeadline[] = Array.from({ length: 8 }, (_, index) => ({
	id: `headline-${index}`,
	title: `헤드라인 ${index + 1}`,
}));

const advance = async (milliseconds: number) => {
	await act(async () => vi.advanceTimersByTimeAsync(milliseconds));
};
const currentHeadline = () => screen.getByRole('link', { current: true });

describe('DailyHeadlines', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
	});

	afterEach(() => {
		vi.useRealTimers();
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

	it('시간이 지나도 현재 헤드라인을 자동으로 옮기지 않는다', async () => {
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		await advance(6000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[0].title);
	});

	it('마우스로 가리킨 항목을 강조하고 영역을 벗어나도 자동 이동하지 않는다', async () => {
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		const second = screen.getByRole('link', { name: dailyHeadlines[1].title });
		fireEvent.mouseEnter(second);
		await advance(6000);
		expect(currentHeadline()).toBe(second);
		fireEvent.mouseLeave(screen.getByRole('region', { name: 'Daily Headlines' }), { relatedTarget: document.body });
		await advance(2000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[1].title);
	});

	it('키보드 초점을 따라 강조하고 목록을 떠나도 자동 이동하지 않는다', async () => {
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
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[1].title);
	});

	it('선택 후 목록이 줄어들어도 존재하는 항목 하나를 현재 항목으로 제공한다', () => {
		const { rerender } = render(<DailyHeadlines dailyHeadlines={dailyHeadlines} />);
		fireEvent.mouseEnter(screen.getByRole('link', { name: dailyHeadlines[7].title }));
		rerender(<DailyHeadlines dailyHeadlines={dailyHeadlines.slice(0, 2)} />);
		expect(screen.getAllByRole('link', { current: true })).toHaveLength(1);
		expect(currentHeadline()).toHaveAttribute('href', expect.stringMatching(/headline-[01]$/));
	});

	it('헤드라인 하나만 있으면 현재 항목을 그대로 유지한다', async () => {
		render(<DailyHeadlines dailyHeadlines={dailyHeadlines.slice(0, 1)} />);
		await advance(6000);
		expect(currentHeadline()).toHaveAccessibleName(dailyHeadlines[0].title);
	});

	it('빈 목록이면 헤드라인 영역에 빈 상태를 표시한다', () => {
		render(<DailyHeadlines dailyHeadlines={[]} />);
		expect(screen.getByRole('region', { name: 'Daily Headlines' })).toHaveTextContent(
			'아직 등록된 헤드라인이 없습니다.',
		);
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});
});
