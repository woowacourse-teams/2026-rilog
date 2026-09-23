import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contentLoadFailedMock } = vi.hoisted(() => ({ contentLoadFailedMock: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({
	analytics: { contentLoadFailed: contentLoadFailedMock },
}));

import ContentLoadFailureTracker from './ContentLoadFailureTracker';

describe('ContentLoadFailureTracker', () => {
	beforeEach(() => contentLoadFailedMock.mockReset());

	it('같은 mount에서는 오류 정보가 바뀌어도 한 번만 기록한다', () => {
		const { rerender } = render(
			<ContentLoadFailureTracker surface="feed" loadPhase="initial" error={new TypeError('network')} />,
		);
		expect(contentLoadFailedMock).toHaveBeenCalledOnce();
		expect(contentLoadFailedMock).toHaveBeenCalledWith(
			expect.objectContaining({ surface: 'feed', loadPhase: 'initial' }),
		);

		rerender(<ContentLoadFailureTracker surface="feed" loadPhase="pagination" error={new Error('retry')} />);
		expect(contentLoadFailedMock).toHaveBeenCalledOnce();
	});
});
