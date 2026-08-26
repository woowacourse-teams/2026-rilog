import { act, fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePostWriteLeaveGuard } from './use-post-write-leave-guard';

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

beforeEach(() => {
	replaceMock.mockReset();
	window.history.replaceState({}, '', '/write');
});

describe('usePostWriteLeaveGuard', () => {
	it('dirty 문서의 내부 이동을 확인하고 취소하거나 계속한다', () => {
		const markClean = vi.fn();
		const navigate = vi.fn();
		const { result } = renderHook(() => usePostWriteLeaveGuard({ isDirty: true, markClean, navigate }));
		const link = document.createElement('a');
		link.href = '/feeds?from=write';
		document.body.append(link);

		fireEvent.click(link);
		expect(result.current.isLeaveModalOpen).toBe(true);

		act(() => result.current.cancelLeave());
		expect(result.current.isLeaveModalOpen).toBe(false);
		expect(navigate).not.toHaveBeenCalled();

		fireEvent.click(link);
		act(() => result.current.confirmLeave());

		expect(result.current.isLeaveModalOpen).toBe(false);
		expect(markClean).toHaveBeenCalledOnce();
		expect(navigate).toHaveBeenCalledWith('/feeds?from=write');
		link.remove();
	});

	it('완료 후 guard를 해제하고 주입된 경로로 이동한다', () => {
		const markClean = vi.fn();
		const navigate = vi.fn();
		const { result } = renderHook(() => usePostWriteLeaveGuard({ isDirty: true, markClean, navigate }));

		act(() => result.current.navigateAfterCompletion('/@rilog/posts/31'));

		expect(markClean).toHaveBeenCalledOnce();
		expect(navigate).toHaveBeenCalledWith('/@rilog/posts/31');
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('이동 함수를 주입하지 않으면 router로 이동한다', () => {
		const { result } = renderHook(() => usePostWriteLeaveGuard({ isDirty: false, markClean: vi.fn() }));

		act(() => result.current.navigateAfterCompletion('/feeds'));

		expect(replaceMock).toHaveBeenCalledWith('/feeds');
	});
});
