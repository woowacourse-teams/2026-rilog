import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HeroMeaningTransition from './HeroMeaningTransition';

describe('HeroMeaningTransition', () => {
	beforeEach(() => {
		vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('첫 화면에 접근성 트리에서 제외된 스크롤 안내를 제공한다', () => {
		const { container } = render(<HeroMeaningTransition />);

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
	});

	it('Rilog의 점이 가진 의미를 헤딩과 설명으로 제공한다', () => {
		render(<HeroMeaningTransition />);

		expect(
			screen.getByRole('heading', {
				level: 2,
				name: '점은 끝이 아니라, 한 단계 더 깊이 들어가는 시작점입니다.',
			}),
		).toBeInTheDocument();
		expect(screen.getByText(/코드에서 점을 통해 객체의 내부에 접근하듯/)).toHaveTextContent(
			/코드에서[\s\S]*한 팀의 이야기를 깊이 들여다봅니다\./,
		);
	});
});
