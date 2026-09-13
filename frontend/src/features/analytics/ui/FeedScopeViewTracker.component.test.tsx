import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FeedScopeViewTracker from './FeedScopeViewTracker';

const analyticsMock = vi.hoisted(() => ({ feedScopeViewed: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({ analytics: analyticsMock }));

describe('FeedScopeViewTracker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('피드가 실제 표시될 때 현재 범위를 기록한다', () => {
		render(<FeedScopeViewTracker feedScope="ALL" isVisible />);

		expect(analyticsMock.feedScopeViewed).toHaveBeenCalledExactlyOnceWith({ feedScope: 'ALL' });
	});

	it('로딩이나 오류로 피드가 표시되지 않으면 기록하지 않는다', () => {
		render(<FeedScopeViewTracker feedScope="COLOG" isVisible={false} />);

		expect(analyticsMock.feedScopeViewed).not.toHaveBeenCalled();
	});

	it('같은 범위의 재표시는 합치고 실제 범위 전환은 순서대로 기록한다', () => {
		const view = render(<FeedScopeViewTracker feedScope="ALL" isVisible />);

		view.rerender(<FeedScopeViewTracker feedScope="ALL" isVisible={false} />);
		view.rerender(<FeedScopeViewTracker feedScope="ALL" isVisible />);
		view.rerender(<FeedScopeViewTracker feedScope="COLOG" isVisible />);
		view.rerender(<FeedScopeViewTracker feedScope="ALL" isVisible />);

		expect(analyticsMock.feedScopeViewed).toHaveBeenNthCalledWith(1, { feedScope: 'ALL' });
		expect(analyticsMock.feedScopeViewed).toHaveBeenNthCalledWith(2, { feedScope: 'COLOG' });
		expect(analyticsMock.feedScopeViewed).toHaveBeenNthCalledWith(3, { feedScope: 'ALL' });
	});
});
