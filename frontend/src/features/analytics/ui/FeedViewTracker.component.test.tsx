import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FeedViewTracker from './FeedViewTracker';

const analyticsMock = vi.hoisted(() => ({ feedViewed: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({ analytics: analyticsMock }));

describe('FeedViewTracker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('피드가 실제 표시될 때 현재 범위를 기록한다', () => {
		render(<FeedViewTracker feedScope="ALL" category="ALL" isVisible />);

		expect(analyticsMock.feedViewed).toHaveBeenCalledExactlyOnceWith({ feedScope: 'ALL', category: 'ALL' });
	});

	it('로딩이나 오류로 피드가 표시되지 않으면 기록하지 않는다', () => {
		render(<FeedViewTracker feedScope="COLOG" category="TECH" isVisible={false} />);

		expect(analyticsMock.feedViewed).not.toHaveBeenCalled();
	});

	it('같은 필터의 재표시는 합치고 범위나 카테고리 전환은 순서대로 기록한다', () => {
		const view = render(<FeedViewTracker feedScope="ALL" category="ALL" isVisible />);

		view.rerender(<FeedViewTracker feedScope="ALL" category="ALL" isVisible={false} />);
		view.rerender(<FeedViewTracker feedScope="ALL" category="ALL" isVisible />);
		view.rerender(<FeedViewTracker feedScope="ALL" category="TECH" isVisible />);
		view.rerender(<FeedViewTracker feedScope="COLOG" category="TECH" isVisible />);
		view.rerender(<FeedViewTracker feedScope="ALL" category="ALL" isVisible />);

		expect(analyticsMock.feedViewed).toHaveBeenNthCalledWith(1, { feedScope: 'ALL', category: 'ALL' });
		expect(analyticsMock.feedViewed).toHaveBeenNthCalledWith(2, { feedScope: 'ALL', category: 'TECH' });
		expect(analyticsMock.feedViewed).toHaveBeenNthCalledWith(3, { feedScope: 'COLOG', category: 'TECH' });
		expect(analyticsMock.feedViewed).toHaveBeenNthCalledWith(4, { feedScope: 'ALL', category: 'ALL' });
	});
});
