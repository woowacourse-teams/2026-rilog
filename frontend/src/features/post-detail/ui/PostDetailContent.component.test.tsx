import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import PostDetailContent from './PostDetailContent';

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

describe('PostDetailContent', () => {
	it('클릭과 키보드로 토글 상태와 접근성 속성을 동기화한다', async () => {
		const user = userEvent.setup();
		render(<PostDetailContent html={TOGGLE_HTML} />);
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
		const { rerender } = render(<PostDetailContent html={TOGGLE_HTML} />);
		const [outerToggle, innerToggle] = screen.getAllByRole('button', { name: '하위 내용 펼치기' });

		await user.click(outerToggle);
		await user.click(innerToggle);
		await user.click(screen.getByRole('button', { name: '다른 버튼' }));
		rerender(<PostDetailContent html={TOGGLE_HTML} />);
		const [rerenderedOuterToggle, rerenderedInnerToggle] = screen.getAllByRole('button', { name: '하위 내용 접기' });

		expect(rerenderedOuterToggle).toHaveAttribute('aria-expanded', 'true');
		expect(rerenderedInnerToggle).toHaveAttribute('aria-expanded', 'true');
		expect(getToggleWrapper(rerenderedOuterToggle)).toHaveAttribute('data-show-children', 'true');
		expect(getToggleWrapper(rerenderedInnerToggle)).toHaveAttribute('data-show-children', 'true');
	});
});
