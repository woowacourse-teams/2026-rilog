import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as BlogProfileEntryContext from '@/features/analytics/lib/blog-profile-entry-context';

const { recordEntryMock } = vi.hoisted(() => ({ recordEntryMock: vi.fn() }));

vi.mock('@/features/analytics/lib/blog-profile-entry-context', async (importOriginal) => ({
	...(await importOriginal<typeof BlogProfileEntryContext>()),
	recordBlogProfileEntryContext: recordEntryMock,
}));

import BlogProfileEntryLink from './BlogProfileEntryLink';

describe('BlogProfileEntryLink', () => {
	beforeEach(() => recordEntryMock.mockReset());

	it('같은 탭으로 이동할 때 진입 경로를 기록한다', async () => {
		const user = userEvent.setup();
		render(
			<BlogProfileEntryLink href="/@jetproc" entrySource="feed">
				프로필
			</BlogProfileEntryLink>,
		);

		await user.click(screen.getByRole('link', { name: '프로필' }));

		expect(recordEntryMock).toHaveBeenCalledWith({ href: '/@jetproc', entrySource: 'feed' });
	});

	it('수정키 이동이나 소비자가 취소한 이동은 기록하지 않는다', () => {
		const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
		const { rerender } = render(
			<BlogProfileEntryLink href="/@jetproc" entrySource="feed">
				프로필
			</BlogProfileEntryLink>,
		);
		fireEvent.click(screen.getByRole('link', { name: '프로필' }), { metaKey: true });
		expect(recordEntryMock).not.toHaveBeenCalled();

		rerender(
			<BlogProfileEntryLink href="/@jetproc" entrySource="feed" onClick={onClick}>
				프로필
			</BlogProfileEntryLink>,
		);
		fireEvent.click(screen.getByRole('link', { name: '프로필' }));
		expect(onClick).toHaveBeenCalledOnce();
		expect(recordEntryMock).not.toHaveBeenCalled();
	});
});
