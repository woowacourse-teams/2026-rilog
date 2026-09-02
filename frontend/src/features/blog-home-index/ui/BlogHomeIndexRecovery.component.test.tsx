import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';

import BlogHomeIndexRecovery from './BlogHomeIndexRecovery';

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock('@/features/blog-home-index/hooks/use-blog-home-index');

describe('BlogHomeIndexRecovery', () => {
	beforeEach(() => {
		refreshMock.mockClear();
	});

	it('인덱스가 계속 실패하면 현재 페이지를 유지한다', () => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: undefined,
			hasError: true,
			isPending: false,
			retry: vi.fn(),
		});

		render(<BlogHomeIndexRecovery slug="jetproc" />);

		expect(refreshMock).not.toHaveBeenCalled();
	});

	it('인덱스 재시도에 성공하면 서버 검증을 위해 한 번 refresh한다', async () => {
		vi.mocked(useBlogHomeIndex).mockReturnValue({
			index: { totalCount: 3, chapterIndexes: [], cologIndexes: [] },
			hasError: false,
			isPending: false,
			retry: vi.fn(),
		});

		render(<BlogHomeIndexRecovery slug="jetproc" />);

		await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
	});
});
