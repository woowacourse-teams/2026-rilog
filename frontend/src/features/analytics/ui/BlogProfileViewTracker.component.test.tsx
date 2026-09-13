import { cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	consumeBlogProfileEntryContext,
	recordBlogProfileEntryContext,
} from '@/features/analytics/lib/blog-profile-entry-context';
import type { analytics } from '@/features/analytics/model/events';

import BlogProfileViewTracker from './BlogProfileViewTracker';

const { blogProfileViewedMock } = vi.hoisted(() => ({
	blogProfileViewedMock: vi.fn<typeof analytics.blogProfileViewed>(),
}));

vi.mock('@/features/analytics/model/events', () => ({ analytics: { blogProfileViewed: blogProfileViewedMock } }));

describe('BlogProfileViewTracker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.history.replaceState(null, '', '/alice');
		consumeBlogProfileEntryContext(window.location.pathname);
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it.each(['COLOG', 'RILOG'] as const)('계측한 링크로 도착한 %s 프로필 조회를 전송한다', (blogType) => {
		recordBlogProfileEntryContext({ href: '/alice', entrySource: 'feed' });
		render(<BlogProfileViewTracker blogType={blogType} blogId={1} />);

		expect(blogProfileViewedMock).toHaveBeenCalledExactlyOnceWith({
			blogType,
			blogId: 1,
			entrySource: 'feed',
			profileVisitId: blogProfileViewedMock.mock.calls[0][0].profileVisitId,
		});
		expect(blogProfileViewedMock.mock.calls[0][0].profileVisitId).toEqual(expect.any(String));
	});

	it('진입 문맥이 없으면 프로필 조회를 전송하지 않는다', () => {
		render(<BlogProfileViewTracker blogType="RILOG" blogId={1} />);

		expect(blogProfileViewedMock).not.toHaveBeenCalled();
	});

	it('Strict Mode와 같은 프로필의 재렌더링에서 방문을 한 번만 기록한다', () => {
		recordBlogProfileEntryContext({ href: '/alice', entrySource: 'feed' });
		const view = render(
			<StrictMode>
				<BlogProfileViewTracker blogType="RILOG" blogId={1} />
			</StrictMode>,
		);
		view.rerender(
			<StrictMode>
				<BlogProfileViewTracker blogType="RILOG" blogId={1} />
			</StrictMode>,
		);

		expect(blogProfileViewedMock).toHaveBeenCalledTimes(1);
	});

	it('다른 프로필 링크로 이동하면 새로운 방문 ID로 기록한다', () => {
		recordBlogProfileEntryContext({ href: '/alice', entrySource: 'feed' });
		const view = render(<BlogProfileViewTracker blogType="RILOG" blogId={1} />);
		const firstVisitId = blogProfileViewedMock.mock.calls[0][0].profileVisitId;

		recordBlogProfileEntryContext({ href: '/team', entrySource: 'profile_colog_list' });
		window.history.replaceState(null, '', '/team');
		view.rerender(<BlogProfileViewTracker blogType="COLOG" blogId={2} />);

		expect(blogProfileViewedMock).toHaveBeenCalledTimes(2);
		expect(blogProfileViewedMock.mock.calls[1][0].entrySource).toBe('profile_colog_list');
		expect(blogProfileViewedMock.mock.calls[1][0].profileVisitId).not.toBe(firstVisitId);
	});

	it('재방문은 계측한 링크로 다시 진입한 경우에만 기록한다', () => {
		recordBlogProfileEntryContext({ href: '/alice', entrySource: 'feed' });
		const view = render(<BlogProfileViewTracker blogType="RILOG" blogId={1} />);
		const firstVisitId = blogProfileViewedMock.mock.calls[0][0].profileVisitId;
		view.unmount();

		const directVisit = render(<BlogProfileViewTracker blogType="RILOG" blogId={1} />);
		expect(blogProfileViewedMock).toHaveBeenCalledTimes(1);
		directVisit.unmount();

		recordBlogProfileEntryContext({ href: '/alice', entrySource: 'colog_members' });
		render(<BlogProfileViewTracker blogType="RILOG" blogId={1} />);

		expect(blogProfileViewedMock).toHaveBeenCalledTimes(2);
		expect(blogProfileViewedMock.mock.calls[1][0].profileVisitId).not.toBe(firstVisitId);
	});

	it('목적지가 다른 문맥은 버리고 이후 같은 주소에 방문해도 재사용하지 않는다', () => {
		recordBlogProfileEntryContext({ href: '/team', entrySource: 'profile_colog_list' });
		const view = render(<BlogProfileViewTracker blogType="RILOG" blogId={1} />);
		window.history.replaceState(null, '', '/team');
		view.rerender(<BlogProfileViewTracker blogType="COLOG" blogId={2} />);

		expect(blogProfileViewedMock).not.toHaveBeenCalled();
	});

	it('30초가 지난 문맥으로는 조회를 전송하지 않는다', () => {
		vi.useFakeTimers();
		recordBlogProfileEntryContext({ href: '/alice', entrySource: 'feed' });
		vi.advanceTimersByTime(30_001);
		render(<BlogProfileViewTracker blogType="RILOG" blogId={1} />);

		expect(blogProfileViewedMock).not.toHaveBeenCalled();
	});
});
