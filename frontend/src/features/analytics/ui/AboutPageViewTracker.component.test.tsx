import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AboutPageViewTracker from './AboutPageViewTracker';

const analyticsMock = vi.hoisted(() => ({ aboutPageViewed: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({ analytics: analyticsMock }));

describe('AboutPageViewTracker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.history.replaceState({}, '', '/about');
	});

	it('페이지가 마운트되면 현재 URL의 획득 경로와 함께 조회를 한 번 기록한다', () => {
		window.history.replaceState(
			{},
			'',
			'/about?utm_source=pre_registration&utm_medium=email&utm_campaign=about_launch',
		);
		const view = render(<AboutPageViewTracker />);

		view.rerender(<AboutPageViewTracker />);

		expect(analyticsMock.aboutPageViewed).toHaveBeenCalledExactlyOnceWith({
			acquisitionSource: 'pre_registration_email',
		});
	});

	it('페이지를 다시 방문해 새로 마운트되면 조회를 새로 기록한다', () => {
		const firstVisit = render(<AboutPageViewTracker />);
		firstVisit.unmount();

		render(<AboutPageViewTracker />);

		expect(analyticsMock.aboutPageViewed).toHaveBeenNthCalledWith(1, { acquisitionSource: 'unattributed' });
		expect(analyticsMock.aboutPageViewed).toHaveBeenNthCalledWith(2, { acquisitionSource: 'unattributed' });
	});
});
