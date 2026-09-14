import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AboutPageLink from './AboutPageLink';

const analyticsMock = vi.hoisted(() => ({ aboutPageLinkClicked: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({ analytics: analyticsMock }));

describe('AboutPageLink', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('후속 링크 클릭을 대상과 함께 기록한다', async () => {
		const user = userEvent.setup();
		render(
			<AboutPageLink href="/feeds" linkTarget="feeds" onClick={(event) => event.preventDefault()}>
				Continue to Rilog.
			</AboutPageLink>,
		);

		await user.click(screen.getByRole('link', { name: 'Continue to Rilog.' }));

		expect(analyticsMock.aboutPageLinkClicked).toHaveBeenCalledExactlyOnceWith({ linkTarget: 'feeds' });
	});
});
