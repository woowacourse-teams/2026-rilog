import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { analytics } from '@/features/analytics/model/events';

import AvailableTracker from './PostNavigationAvailableTracker';
import Link from './PostNavigationLink';
import SeriesDetails from './PostNavigationSeriesDetails';
import VisitProvider from './PostNavigationVisitProvider';
const tracking = vi.hoisted(() => ({
	postNavigationAvailable: vi.fn<typeof analytics.postNavigationAvailable>(),
	postNavigationClicked: vi.fn<typeof analytics.postNavigationClicked>(),
	postSeriesExpanded: vi.fn<typeof analytics.postSeriesExpanded>(),
}));
vi.mock('@/features/analytics/model/events', () => ({ analytics: tracking }));

function Exploration({ postId = 1, chapterId = 10 }: { postId?: number; chapterId?: number | null }) {
	return (
		<VisitProvider key={postId} postId={postId} chapterId={chapterId} ownerType="RILOG">
			<AvailableTracker surface="series" />
			<Link href="#next" surface="series" targetType="post" targetPostId={2} position={1} clickPart="title">
				다음 글
			</Link>
			<SeriesDetails aria-label="시리즈">
				<summary>시리즈 펼치기</summary>
			</SeriesDetails>
		</VisitProvider>
	);
}

const expandSeries = () => {
	const details = screen.getByLabelText<HTMLDetailsElement>('시리즈');
	details.open = true;
	fireEvent(details, new Event('toggle'));
};

describe('게시글 탐색 계측', () => {
	beforeEach(() => vi.clearAllMocks());

	it('한 방문의 노출, 클릭, 펼침을 같은 ID와 게시글 정보로 기록한다', () => {
		render(<Exploration />);
		fireEvent.click(screen.getByRole('link', { name: '다음 글' }));
		expandSeries();

		const navigationVisitId = tracking.postNavigationAvailable.mock.calls[0][0].navigationVisitId;
		expect(tracking.postNavigationAvailable).toHaveBeenCalledExactlyOnceWith({
			navigationVisitId,
			postId: 1,
			ownerType: 'RILOG',
			chapterId: 10,
			surface: 'series',
		});
		expect(tracking.postNavigationClicked).toHaveBeenCalledExactlyOnceWith({
			navigationVisitId,
			postId: 1,
			ownerType: 'RILOG',
			chapterId: 10,
			surface: 'series',
			targetType: 'post',
			targetPostId: 2,
			position: 1,
			clickPart: 'title',
		});
		expect(tracking.postSeriesExpanded).toHaveBeenCalledExactlyOnceWith({
			navigationVisitId,
			postId: 1,
			ownerType: 'RILOG',
			chapterId: 10,
		});
	});

	it('Strict Mode와 재렌더링에서 노출과 방문 ID가 유지된다', () => {
		const view = render(
			<StrictMode>
				<Exploration />
			</StrictMode>,
		);
		const navigationVisitId = tracking.postNavigationAvailable.mock.calls[0][0].navigationVisitId;
		view.rerender(
			<StrictMode>
				<Exploration />
			</StrictMode>,
		);
		fireEvent.click(screen.getByRole('link', { name: '다음 글' }));
		expect(tracking.postNavigationAvailable).toHaveBeenCalledTimes(1);
		expect(tracking.postNavigationClicked.mock.calls[0][0].navigationVisitId).toBe(navigationVisitId);
	});

	it('게시글 이동과 같은 게시글 재방문은 새 방문으로 구분한다', () => {
		const view = render(<Exploration />);
		view.rerender(<Exploration postId={2} />);
		view.unmount();
		render(<Exploration />);
		const ids = tracking.postNavigationAvailable.mock.calls.map(([event]) => event.navigationVisitId);
		expect(ids).toHaveLength(3);
		expect(new Set(ids).size).toBe(3);
	});

	it('챕터가 없으면 노출, 클릭, 펼침을 전송하지 않는다', () => {
		render(<Exploration chapterId={null} />);
		fireEvent.click(screen.getByRole('link', { name: '다음 글' }));
		expandSeries();
		expect(tracking.postNavigationAvailable).not.toHaveBeenCalled();
		expect(tracking.postNavigationClicked).not.toHaveBeenCalled();
		expect(tracking.postSeriesExpanded).not.toHaveBeenCalled();
	});

	it('provider가 없으면 이벤트를 전송하지 않는다', () => {
		render(
			<>
				<AvailableTracker surface="series" />
				<Link href="#next" surface="series" targetType="post" position={1} clickPart="title">
					다음 글
				</Link>
				<SeriesDetails aria-label="시리즈">
					<summary>시리즈 펼치기</summary>
				</SeriesDetails>
			</>,
		);
		fireEvent.click(screen.getByRole('link', { name: '다음 글' }));
		expandSeries();
		expect(tracking.postNavigationAvailable).not.toHaveBeenCalled();
		expect(tracking.postNavigationClicked).not.toHaveBeenCalled();
		expect(tracking.postSeriesExpanded).not.toHaveBeenCalled();
	});

	it('가운데 클릭은 기록하고 오른쪽 클릭과 시리즈 닫기는 기록하지 않는다', () => {
		render(<Exploration />);
		const link = screen.getByRole('link', { name: '다음 글' });
		fireEvent(link, new MouseEvent('auxclick', { bubbles: true, button: 1 }));
		fireEvent(link, new MouseEvent('auxclick', { bubbles: true, button: 2 }));
		fireEvent(screen.getByLabelText('시리즈'), new Event('toggle'));
		expect(tracking.postNavigationClicked).toHaveBeenCalledTimes(1);
		expect(tracking.postSeriesExpanded).not.toHaveBeenCalled();
	});
});

describe('UUID 방문 ID', () => {
	it('서버 렌더링에서는 UUID를 생성하지 않는다', () => {
		const uuid = vi.spyOn(window.crypto, 'randomUUID');
		renderToString(<Exploration />);
		expect(uuid).not.toHaveBeenCalled();
		uuid.mockRestore();
	});

	it('독립된 같은 게시글 방문에 각각 UUID 하나만 생성한다', () => {
		vi.clearAllMocks();
		const uuid = vi.spyOn(window.crypto, 'randomUUID');
		render(
			<StrictMode>
				<Exploration />
			</StrictMode>,
		);
		render(
			<StrictMode>
				<Exploration />
			</StrictMode>,
		);
		const ids = tracking.postNavigationAvailable.mock.calls.map(([event]) => event.navigationVisitId);
		expect(uuid).toHaveBeenCalledTimes(2);
		expect(new Set(ids).size).toBe(2);
		for (const id of ids) {
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		}
		uuid.mockRestore();
	});
});
