import { describe, expect, it, vi } from 'vitest';

import HomePage from './page';

const { redirectMock } = vi.hoisted(() => ({
	redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	redirect: redirectMock,
}));

describe('HomePage', () => {
	it('루트 경로에서 피드 경로로 이동시킨다', () => {
		HomePage();

		expect(redirectMock).toHaveBeenCalledWith('/feeds');
	});
});
