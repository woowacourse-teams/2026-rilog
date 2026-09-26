import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AboutPageEntryLink from './AboutPageEntryLink';

const analyticsMock = vi.hoisted(() => ({ aboutPageEntryClicked: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({ analytics: analyticsMock }));

describe('AboutPageEntryLink', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(['sidebar', 'footer', 'release_note'] as const)(
		'%s 링크 클릭을 진입 위치와 함께 기록한다',
		async (entrySource) => {
			const user = userEvent.setup();
			render(
				<AboutPageEntryLink entrySource={entrySource} onClick={(event) => event.preventDefault()}>
					Rilog 이야기
				</AboutPageEntryLink>,
			);

			const link = screen.getByRole('link', { name: 'Rilog 이야기' });
			expect(link).toHaveAttribute('href', '/about');
			await user.click(link);

			expect(analyticsMock.aboutPageEntryClicked).toHaveBeenCalledExactlyOnceWith({ entrySource });
		},
	);

	it('호출자가 이동을 취소해도 클릭 자체는 기록한다', async () => {
		const user = userEvent.setup();
		render(
			<AboutPageEntryLink entrySource="footer" onClick={(event) => event.preventDefault()}>
				Rilog 이야기
			</AboutPageEntryLink>,
		);

		await user.click(screen.getByRole('link', { name: 'Rilog 이야기' }));

		expect(analyticsMock.aboutPageEntryClicked).toHaveBeenCalledExactlyOnceWith({ entrySource: 'footer' });
	});
});
