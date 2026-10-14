import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps, MouseEvent as ReactMouseEvent } from 'react';

import { consumePostDetailEntryContext } from '@/features/analytics/lib/post-detail-entry-context';
import { captureAnalyticsEvent } from '@/shared/analytics/posthog';
import type CustomLink from '@/shared/ui/link/CustomLink';

import TheRilogAnalyticsTracker from './TheRilogAnalyticsTracker';
import TheRilogArticleLink from './TheRilogArticleLink';

vi.mock('@/shared/analytics/posthog', () => ({ captureAnalyticsEvent: vi.fn() }));
// Replace the Next router boundary while retaining CustomLink and the analytics facade.
vi.mock('next/link', () => ({
	default: ({
		href,
		onClick,
		onNavigate,
		prefetch,
		...props
	}: ComponentProps<typeof CustomLink> & { prefetch?: boolean }) => {
		void prefetch;
		return (
			<a
				{...props}
				href={typeof href === 'string' ? href : (href.pathname ?? '')}
				onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => {
					onClick?.(event);
					if (
						!event.defaultPrevented &&
						!event.metaKey &&
						!event.ctrlKey &&
						!event.shiftKey &&
						!event.altKey &&
						(event.currentTarget.target === '' || event.currentTarget.target === '_self') &&
						!event.currentTarget.hasAttribute('download')
					) {
						onNavigate?.({ preventDefault: () => event.preventDefault() });
					}
					event.preventDefault();
				}}
			/>
		);
	},
}));
const capture = vi.mocked(captureAnalyticsEvent);
const clicks = () => capture.mock.calls.filter(([name]) => name.endsWith('clicked'));
const renderLink = (props: Partial<ComponentProps<typeof TheRilogArticleLink>> = {}) =>
	render(
		<TheRilogAnalyticsTracker>
			<TheRilogArticleLink
				href="/@news/posts/100#heading"
				postId={100}
				contentType="headline"
				position={2}
				headlineId="100:heading"
				{...props}
			>
				기사
			</TheRilogArticleLink>
		</TheRilogAnalyticsTracker>,
	);

describe('TheRilogArticleLink', () => {
	beforeEach(() => {
		capture.mockClear();
		window.sessionStorage.clear();
	});

	it.each(['headline', 'enterprise', 'personal'] as const)(
		'%s 클릭은 기사 ID와 종류 및 위치를 전송하고 같은 탭 상세와 연결한다',
		async (contentType) => {
			renderLink({ contentType, headlineId: contentType === 'headline' ? '100:heading' : undefined });
			await userEvent.click(screen.getByRole('link', { name: '기사' }));
			const [name, props] = clicks()[0];
			expect(name).toBe(`the rilog ${contentType} clicked`);
			expect(props).toMatchObject({
				post_id: 100,
				content_type: contentType,
				position: 2,
				navigation_type: 'same_tab',
			});
			expect(props?.the_rilog_visit_id).toEqual(expect.any(String));
			expect(props?.the_rilog_click_id).toEqual(expect.any(String));
			const context = consumePostDetailEntryContext(100);
			expect(context).toMatchObject({
				entrySource: 'the_rilog',
				feedPosition: null,
				theRilog: {
					theRilogVisitId: props?.the_rilog_visit_id,
					theRilogClickId: props?.the_rilog_click_id,
					contentType,
					position: 2,
				},
			});
			if (contentType === 'headline') expect(context?.theRilog?.headlineId).toBe('100:heading');
			else expect(props).not.toHaveProperty('headline_id');
			expect(consumePostDetailEntryContext(100)).toBeNull();
			expect(screen.getByRole('link')).toHaveAttribute('href', '/@news/posts/100#heading');
		},
	);

	it('키보드 Enter와 반복 클릭은 서로 다른 클릭 ID를 기록한다', async () => {
		renderLink();
		const user = userEvent.setup();
		await user.tab();
		await user.keyboard('{Enter}');
		await user.click(screen.getByRole('link'));
		expect(clicks()).toHaveLength(2);
		expect(clicks()[0][1]?.the_rilog_click_id).not.toBe(clicks()[1][1]?.the_rilog_click_id);
	});

	it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }])(
		'수정키 새 탭 클릭은 클릭만 집계하고 상세 진입 정보를 남기지 않는다',
		(modifier) => {
			renderLink();
			fireEvent.click(screen.getByRole('link'), modifier);
			expect(clicks()[0][1]?.navigation_type).toBe('new_tab');
			expect(consumePostDetailEntryContext(100)).toBeNull();
		},
	);

	it('가운데 버튼과 target 새 탭 클릭은 클릭만 집계한다', () => {
		renderLink({ target: '_blank' });
		fireEvent.click(screen.getByRole('link'));
		fireEvent(screen.getByRole('link'), new MouseEvent('auxclick', { bubbles: true, button: 1 }));
		expect(clicks()).toHaveLength(2);
		expect(clicks().map(([, props]) => props?.navigation_type)).toEqual(['new_tab', 'new_tab']);
		expect(consumePostDetailEntryContext(100)).toBeNull();
	});

	it('hover와 취소된 click은 집계하지 않고 진입 정보도 남기지 않는다', () => {
		renderLink({ onClick: (event) => event.preventDefault() });
		fireEvent.mouseEnter(screen.getByRole('link'));
		fireEvent.click(screen.getByRole('link'));
		expect(clicks()).toHaveLength(0);
		expect(consumePostDetailEntryContext(100)).toBeNull();
	});
});
