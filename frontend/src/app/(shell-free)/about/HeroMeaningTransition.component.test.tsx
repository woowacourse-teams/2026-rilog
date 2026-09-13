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
});
