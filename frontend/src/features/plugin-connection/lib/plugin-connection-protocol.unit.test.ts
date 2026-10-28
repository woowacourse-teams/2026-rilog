import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	getPluginRefreshDelay,
	getPluginStudioOrigin,
	isPluginRefreshRequest,
	parsePluginConnectionRequest,
	RILOG_IMPORT_STUDIO_ORIGIN,
} from './plugin-connection-protocol';

const state = 'a'.repeat(64);

afterEach(() => vi.unstubAllEnvs());

describe('플러그인 연결 경계', () => {
	it('충분한 무작위 state와 지정한 환경만 허용한다', () => {
		expect(parsePluginConnectionRequest(state, 'develop')).toEqual({ state, environment: 'develop' });
		for (const value of ['', '1234', 'https://evil.com', null])
			expect(parsePluginConnectionRequest(value, 'develop')).toBeNull();
		expect(parsePluginConnectionRequest(state, 'https://evil.com')).toBeNull();
	});
	it('고정된 origin의 원래 opener가 보낸 같은 요청만 허용한다', () => {
		const opener = {} as Window;
		const request = { state, environment: 'develop' as const };
		const event = (overrides: Partial<MessageEvent> = {}) =>
			({
				origin: RILOG_IMPORT_STUDIO_ORIGIN,
				source: opener,
				data: { type: 'rilog-import-auth-refresh', ...request },
				...overrides,
			}) as MessageEvent;
		expect(isPluginRefreshRequest(event(), opener, request, RILOG_IMPORT_STUDIO_ORIGIN)).toBe(true);
		expect(
			isPluginRefreshRequest(event({ origin: 'https://evil.com' }), opener, request, RILOG_IMPORT_STUDIO_ORIGIN),
		).toBe(false);
		expect(isPluginRefreshRequest(event({ source: {} as Window }), opener, request, RILOG_IMPORT_STUDIO_ORIGIN)).toBe(
			false,
		);
		expect(
			isPluginRefreshRequest(
				event({ data: { type: 'rilog-import-auth-refresh', ...request, state: 'b'.repeat(64) } }),
				opener,
				request,
				RILOG_IMPORT_STUDIO_ORIGIN,
			),
		).toBe(false);
		expect(
			isPluginRefreshRequest(
				event({ data: { type: 'rilog-import-auth-refresh', ...request, environment: 'production' } }),
				opener,
				request,
				RILOG_IMPORT_STUDIO_ORIGIN,
			),
		).toBe(false);
	});
	it('운영 빌드는 입력 설정과 무관하게 신뢰한 Site origin만 사용한다', () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('NEXT_PUBLIC_RILOG_IMPORT_STUDIO_ORIGIN', 'https://evil.com');
		expect(getPluginStudioOrigin()).toBe(RILOG_IMPORT_STUDIO_ORIGIN);
	});
	it('개발 환경은 지정한 로컬 플러그인 주소만 추가 허용한다', () => {
		vi.stubEnv('NODE_ENV', 'development');
		vi.stubEnv('NEXT_PUBLIC_RILOG_IMPORT_STUDIO_ORIGIN', 'http://127.0.0.1:4317');
		expect(getPluginStudioOrigin()).toBe('http://127.0.0.1:4317');
		vi.stubEnv('NEXT_PUBLIC_RILOG_IMPORT_STUDIO_ORIGIN', 'https://evil.com');
		expect(getPluginStudioOrigin()).toBe(RILOG_IMPORT_STUDIO_ORIGIN);
	});
	it('만료 전에 갱신하고 아주 짧은 토큰은 반복 호출 간격을 제한한다', () => {
		expect(getPluginRefreshDelay(new Date(60_000).toISOString(), 0)).toBe(30_000);
		expect(getPluginRefreshDelay(new Date(1_000).toISOString(), 0)).toBe(5_000);
	});
});
