import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BlogProfileViewTracker from './BlogProfileViewTracker';

const { blogProfileViewedMock } = vi.hoisted(() => ({ blogProfileViewedMock: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({ analytics: { blogProfileViewed: blogProfileViewedMock } }));

describe('BlogProfileViewTracker', () => {
	it.each(['COLOG', 'RILOG'] as const)('블로그 타입 %s의 공개 프로필 조회를 전송한다', (blogType) => {
		render(<BlogProfileViewTracker blogType={blogType} />);

		expect(blogProfileViewedMock).toHaveBeenCalledWith({ blogType });
	});
});
