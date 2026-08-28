import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMobileDevice } from './use-mobile-device';

interface MatchMediaController {
	mediaQueryList: MediaQueryList;
	setMatches: (matches: boolean) => void;
}

const createMatchMediaController = (initialMatches: boolean): MatchMediaController => {
	let matches = initialMatches;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	const mediaQueryList = {
		media: '(max-width: 767px)',
		get matches() {
			return matches;
		},
		addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
			listeners.add(listener);
		},
		removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
			listeners.delete(listener);
		},
	} as unknown as MediaQueryList;

	return {
		mediaQueryList,
		setMatches: (nextMatches) => {
			matches = nextMatches;
			listeners.forEach((listener) => listener({ matches, media: mediaQueryList.media } as MediaQueryListEvent));
		},
	};
};

const setNavigatorSignals = ({
	maxTouchPoints = 0,
	platform = 'Linux x86_64',
	userAgent = 'Mozilla/5.0 Safari/605.1.15',
	userAgentDataMobile,
}: {
	maxTouchPoints?: number;
	platform?: string;
	userAgent?: string;
	userAgentDataMobile?: boolean;
}) => {
	vi.stubGlobal('navigator', {
		maxTouchPoints,
		platform,
		userAgent,
		userAgentData: userAgentDataMobile === undefined ? undefined : { mobile: userAgentDataMobile },
	});
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('useMobileDevice', () => {
	it('확정된 모바일 기기는 넓은 viewport에서도 차단 대상으로 유지한다', async () => {
		const media = createMatchMediaController(false);
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => media.mediaQueryList),
		);
		setNavigatorSignals({ userAgentDataMobile: true });

		const { result } = renderHook(() => useMobileDevice());

		await waitFor(() => expect(result.current).toEqual({ isMobileDevice: true, isResolved: true }));
	});

	it('확정된 데스크톱 기기는 좁은 viewport에서도 허용한다', async () => {
		const media = createMatchMediaController(true);
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => media.mediaQueryList),
		);
		setNavigatorSignals({ userAgentDataMobile: false });

		const { result } = renderHook(() => useMobileDevice());

		await waitFor(() => expect(result.current).toEqual({ isMobileDevice: false, isResolved: true }));
	});

	it.each([
		'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Mobile Safari/537.36',
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
	])('모바일 user agent를 넓은 viewport에서도 차단 대상으로 판정한다', async (userAgent) => {
		const media = createMatchMediaController(false);
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => media.mediaQueryList),
		);
		setNavigatorSignals({ userAgentDataMobile: undefined, userAgent });

		const { result } = renderHook(() => useMobileDevice());

		await waitFor(() => expect(result.current).toEqual({ isMobileDevice: true, isResolved: true }));
	});

	it('iPadOS heuristic을 모바일로 판정한다', async () => {
		const media = createMatchMediaController(false);
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => media.mediaQueryList),
		);
		setNavigatorSignals({ maxTouchPoints: 5, platform: 'MacIntel', userAgentDataMobile: undefined });

		const { result } = renderHook(() => useMobileDevice());

		await waitFor(() => expect(result.current).toEqual({ isMobileDevice: true, isResolved: true }));
	});

	it('기기 판정이 불확실하면 viewport 변화에 따라 모바일 상태를 갱신한다', async () => {
		const media = createMatchMediaController(false);
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => media.mediaQueryList),
		);
		setNavigatorSignals({ userAgentDataMobile: undefined });

		const { result } = renderHook(() => useMobileDevice());
		await waitFor(() => expect(result.current).toEqual({ isMobileDevice: false, isResolved: true }));

		act(() => media.setMatches(true));

		expect(result.current).toEqual({ isMobileDevice: true, isResolved: true });
	});
});
