import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseMobileDeviceResult } from '@/shared/hooks/use-mobile-device';

import PostWriteDeviceGate from './PostWriteDeviceGate';

const { useMobileDeviceMock } = vi.hoisted(() => ({
	useMobileDeviceMock: vi.fn<() => UseMobileDeviceResult>(),
}));

vi.mock('@/shared/hooks/use-mobile-device', () => ({
	useMobileDevice: useMobileDeviceMock,
}));

vi.mock('./PostWriteWorkspace', () => ({
	default: () => <div>글쓰기 워크스페이스</div>,
}));

describe('PostWriteDeviceGate', () => {
	beforeEach(() => {
		useMobileDeviceMock.mockReset();
	});

	it('모바일 판정 중에는 중립적인 상태를 안내한다', () => {
		useMobileDeviceMock.mockReturnValue({ isMobileDevice: false, isResolved: false });

		render(<PostWriteDeviceGate />);

		expect(screen.getByRole('status')).toHaveTextContent('글쓰기 환경을 확인하고 있어요.');
		expect(screen.queryByText('글쓰기 워크스페이스')).not.toBeInTheDocument();
	});

	it('모바일에서는 PC 이용 안내와 피드 이동 링크만 제공한다', () => {
		useMobileDeviceMock.mockReturnValue({ isMobileDevice: true, isResolved: true });

		render(<PostWriteDeviceGate />);

		expect(screen.getByRole('heading', { name: '글 작성은 PC에서 이용해 주세요' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '피드로 돌아가기' })).toHaveAttribute('href', '/feeds');
		expect(screen.queryByText('글쓰기 워크스페이스')).not.toBeInTheDocument();
	});

	it('데스크톱에서만 글쓰기 workspace를 불러온다', async () => {
		useMobileDeviceMock.mockReturnValue({ isMobileDevice: false, isResolved: true });

		render(<PostWriteDeviceGate />);

		expect(await screen.findByText('글쓰기 워크스페이스')).toBeInTheDocument();
	});
});
