import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { analytics } from '@/features/analytics/model/events';
import { renderMermaidDiagram } from '@/shared/lib/render-mermaid-diagram';

import PostDetailContent from './PostDetailContent';

vi.mock('@/shared/lib/render-mermaid-diagram', () => ({
	renderMermaidDiagram: vi.fn(() => Promise.resolve('<svg><text>Rendered diagram</text></svg>')),
}));

const TOGGLE_HTML = `
	<div class="bn-block">
		<div class="bn-block-content">
			<div class="bn-toggle-wrapper" data-show-children="false">
				<button type="button" data-post-detail-toggle aria-label="하위 내용 펼치기" aria-expanded="false" aria-controls="outer-content">▶</button>
				<h2>바깥 토글</h2>
			</div>
		</div>
		<div id="outer-content" class="bn-block-group">
			<div class="bn-block">
				<div class="bn-block-content">
					<div class="bn-toggle-wrapper" data-show-children="false">
						<button type="button" data-post-detail-toggle aria-label="하위 내용 펼치기" aria-expanded="false" aria-controls="inner-content">▶</button>
						<p>안쪽 토글</p>
					</div>
				</div>
				<div id="inner-content" class="bn-block-group"><p>안쪽 내용</p></div>
			</div>
		</div>
	</div>
	<button type="button">다른 버튼</button>
`;

const getToggleWrapper = (button: HTMLElement): HTMLElement => {
	const wrapper = button.closest<HTMLElement>('.bn-toggle-wrapper');
	if (wrapper === null) {
		throw new Error('토글 wrapper를 찾을 수 없습니다.');
	}

	return wrapper;
};

const getToggleButtonByContent = (content: string): HTMLButtonElement => {
	const wrapper = screen.getByText(content).closest<HTMLElement>('.bn-toggle-wrapper');
	const button = wrapper?.querySelector<HTMLButtonElement>('button[data-post-detail-toggle]');
	if (button === null || button === undefined) {
		throw new Error('토글 button을 찾을 수 없습니다.');
	}

	return button;
};

describe('PostDetailContent', () => {
	let postDetailViewedMock: ReturnType<typeof vi.spyOn>;
	let postReadEngagedMock: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		postDetailViewedMock = vi.spyOn(analytics, 'postDetailViewed').mockImplementation(() => undefined);
		postReadEngagedMock = vi.spyOn(analytics, 'postReadEngaged').mockImplementation(() => undefined);
		window.sessionStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('Mermaid 코드블록을 상세 다이어그램으로 렌더링한다', async () => {
		const html = `
			<div class="bn-block-outer" data-id="mermaid-block">
				<div class="bn-block">
					<div class="bn-block-content" data-content-type="codeBlock" data-language="mermaid">
						<pre><code>graph TD; A--&gt;B</code></pre>
					</div>
				</div>
			</div>
		`;
		render(<PostDetailContent html={html} postId={1} ownerType="RILOG" category="IT" />);

		const diagram = await screen.findByRole('img', { name: 'Mermaid 다이어그램' });
		expect(diagram.querySelector('svg')).toHaveTextContent('Rendered diagram');
		expect(vi.mocked(renderMermaidDiagram)).toHaveBeenCalledWith(expect.any(String), 'graph TD; A-->B');
	});

	it('클릭과 키보드로 토글 상태와 접근성 속성을 동기화한다', async () => {
		const user = userEvent.setup();
		render(<PostDetailContent html={TOGGLE_HTML} postId={1} ownerType="RILOG" category="IT" />);
		const [outerToggle] = screen.getAllByRole('button', { name: '하위 내용 펼치기' });

		await user.click(outerToggle);
		expect(outerToggle).toHaveAttribute('aria-expanded', 'true');
		expect(outerToggle).toHaveAccessibleName('하위 내용 접기');
		expect(getToggleWrapper(outerToggle)).toHaveAttribute('data-show-children', 'true');

		outerToggle.focus();
		await user.keyboard('{Enter}');
		expect(outerToggle).toHaveAttribute('aria-expanded', 'false');

		await user.keyboard(' ');
		expect(outerToggle).toHaveAttribute('aria-expanded', 'true');
	});

	it('중첩 토글 상태를 독립적으로 유지하고 동일 HTML 재렌더에서 초기화하지 않는다', async () => {
		const user = userEvent.setup();
		const { rerender } = render(<PostDetailContent html={TOGGLE_HTML} postId={1} ownerType="RILOG" category="IT" />);
		const [outerToggle, innerToggle] = screen.getAllByRole('button', { name: '하위 내용 펼치기' });

		await user.click(outerToggle);
		await user.click(innerToggle);
		await user.click(screen.getByRole('button', { name: '다른 버튼' }));
		rerender(<PostDetailContent html={TOGGLE_HTML} postId={1} ownerType="RILOG" category="IT" />);
		const [rerenderedOuterToggle, rerenderedInnerToggle] = screen.getAllByRole('button', { name: '하위 내용 접기' });

		expect(rerenderedOuterToggle).toHaveAttribute('aria-expanded', 'true');
		expect(rerenderedInnerToggle).toHaveAttribute('aria-expanded', 'true');
		expect(getToggleWrapper(rerenderedOuterToggle)).toHaveAttribute('data-show-children', 'true');
		expect(getToggleWrapper(rerenderedInnerToggle)).toHaveAttribute('data-show-children', 'true');
	});

	it('다른 게시글로 전환하면 토글 상태를 초기화한다', async () => {
		const user = userEvent.setup();
		const { rerender } = render(<PostDetailContent html={TOGGLE_HTML} postId={1} ownerType="RILOG" category="IT" />);
		const [outerToggle] = screen.getAllByRole('button', { name: '하위 내용 펼치기' });

		await user.click(outerToggle);
		expect(outerToggle).toHaveAttribute('aria-expanded', 'true');

		rerender(
			<PostDetailContent
				html={TOGGLE_HTML.replace('바깥 토글', '새 게시글 토글')}
				postId={2}
				ownerType="COLOG"
				category="DAILY"
			/>,
		);

		const nextPostOuterToggle = getToggleButtonByContent('새 게시글 토글');
		expect(nextPostOuterToggle).toHaveAttribute('aria-expanded', 'false');
		expect(getToggleWrapper(nextPostOuterToggle)).toHaveAttribute('data-show-children', 'false');
	});

	it('상세 페이지 최초 진입 시 entry context를 소비해 조회 이벤트를 한 번 전송한다', () => {
		window.sessionStorage.setItem(
			'rilog.post-detail-entry-context',
			JSON.stringify({
				postId: 101,
				entrySource: 'feed',
				feedPosition: 4,
			}),
		);

		render(<PostDetailContent html="<p>본문</p>" postId={101} ownerType="COLOG" category="DAILY" />);

		return waitFor(() => {
			expect(postDetailViewedMock).toHaveBeenCalledWith({
				postId: 101,
				ownerType: 'COLOG',
				category: 'DAILY',
				entrySource: 'feed',
				feedPosition: 4,
			});
			expect(window.sessionStorage.getItem('rilog.post-detail-entry-context')).toBeNull();
		});
	});

	it('entry context가 없으면 direct로 조회 이벤트를 기록한다', () => {
		render(<PostDetailContent html="<p>본문</p>" postId={102} ownerType="RILOG" category="IT" />);

		return waitFor(() => {
			expect(postDetailViewedMock).toHaveBeenCalledWith({
				postId: 102,
				ownerType: 'RILOG',
				category: 'IT',
				entrySource: 'direct',
				feedPosition: null,
			});
		});
	});

	it('Strict Mode 재마운트에서도 조회 이벤트를 중복 전송하지 않는다', () => {
		render(
			<StrictMode>
				<PostDetailContent html="<p>본문</p>" postId={103} ownerType="RILOG" category="IT" />
			</StrictMode>,
		);

		expect(postDetailViewedMock).toHaveBeenCalledTimes(1);
	});

	it('본문 스크롤 깊이가 50%에 도달하면 engagement를 한 번 전송한다', () => {
		let currentTime = 1_000;
		let articleTop = 900;
		let visibilityState: DocumentVisibilityState = 'visible';

		vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
		vi.stubGlobal('innerHeight', 700);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBoundingClientRect(
			this: HTMLElement,
		) {
			if (this.hasAttribute('data-post-detail-content')) {
				return {
					top: articleTop,
					bottom: articleTop + 1200,
					left: 0,
					right: 0,
					width: 800,
					height: 1200,
					x: 0,
					y: articleTop,
					toJSON: () => ({}),
				};
			}

			return {
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				width: 0,
				height: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			};
		});

		render(<PostDetailContent html="<p>본문</p>" postId={104} ownerType="RILOG" category="IT" />);

		window.dispatchEvent(new Event('scroll'));
		expect(postReadEngagedMock).not.toHaveBeenCalled();

		currentTime = 1_500;
		visibilityState = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));
		currentTime = 601_500;
		visibilityState = 'visible';
		document.dispatchEvent(new Event('visibilitychange'));

		currentTime = 604_500;
		articleTop = 50;

		window.dispatchEvent(new Event('scroll'));
		window.dispatchEvent(new Event('resize'));

		expect(postReadEngagedMock).toHaveBeenCalledTimes(1);
		expect(postReadEngagedMock).toHaveBeenCalledWith({
			postId: 104,
			engagementSeconds: 3,
			scrollDepthBucket: '50_percent',
		});
	});
});
