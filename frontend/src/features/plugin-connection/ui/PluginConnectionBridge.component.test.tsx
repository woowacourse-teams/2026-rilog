import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginConnectionError } from '@/shared/api/auth/api';
import type * as PluginConnectionApi from '@/shared/api/auth/api';

import PluginConnectionBridge from './PluginConnectionBridge';

const { refreshMock, params } = vi.hoisted(() => ({
	refreshMock: vi.fn(),
	params: { state: 'a'.repeat(64), environment: 'develop' },
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(params) }));
vi.mock('@/shared/api/auth/api', async (original) => ({
	...(await original<typeof PluginConnectionApi>()),
	refreshPluginConnection: refreshMock,
}));

const origin = 'https://rilog-import-studio.soonjae8297.chatgpt.site';
let opener: { postMessage: ReturnType<typeof vi.fn>; closed: boolean };
const credentials = () => ({
	accessToken: 'private-test-token',
	profile: { id: 3, nickname: '파라디', slug: 'jetproc' },
	expiresAt: new Date(Date.now() + 60_000).toISOString(),
});
const message = (data: unknown, messageOrigin = origin, source: unknown = opener) => {
	const event = new MessageEvent('message', { origin: messageOrigin, data });
	Object.defineProperty(event, 'source', { value: source });
	window.dispatchEvent(event);
};

beforeEach(() => {
	vi.useFakeTimers();
	params.state = 'a'.repeat(64);
	params.environment = 'develop';
	opener = { postMessage: vi.fn(), closed: false };
	Object.defineProperty(window, 'opener', { configurable: true, value: opener });
	refreshMock.mockReset();
	refreshMock.mockImplementation(() => Promise.resolve(credentials()));
	localStorage.clear();
	sessionStorage.clear();
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	Object.defineProperty(window, 'opener', { configurable: true, value: null });
});

const connect = async () => {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: '이 계정으로 연결' }));
		await Promise.resolve();
	});
};

describe('Rilog 플러그인 연결 창', () => {
	it('사용자가 연결을 누르기 전에는 쿠키를 갱신하거나 자격증명을 보내지 않는다', () => {
		render(<PluginConnectionBridge />);
		expect(refreshMock).not.toHaveBeenCalled();
		expect(opener.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'rilog-import-auth-ready', ...params }, origin);
		expect(JSON.stringify(opener.postMessage.mock.calls)).not.toContain('accessToken');
	});
	it('연결하면 지정한 opener에만 토큰을 보내고 화면과 저장소에는 남기지 않는다', async () => {
		render(<PluginConnectionBridge />);
		await connect();
		expect(refreshMock).toHaveBeenCalledWith('develop');
		expect(opener.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'rilog-import-auth',
				state: params.state,
				environment: 'develop',
				accessToken: 'private-test-token',
				profile: { id: 3, nickname: '파라디', slug: 'jetproc' },
			}),
			origin,
		);
		expect(screen.getByText('파라디 (@jetproc)')).toBeInTheDocument();
		expect(document.body.textContent).not.toContain('private-test-token');
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
	});
	it('외부 origin과 잘못된 요청은 무시하고 원래 연결 창의 갱신 요청만 처리한다', async () => {
		render(<PluginConnectionBridge />);
		await connect();
		const data = { type: 'rilog-import-auth-refresh', ...params };
		act(() => {
			message(data, 'https://evil.com');
			message(data, origin, {});
			message({ ...data, state: 'b'.repeat(64) });
			message({ ...data, environment: 'production' });
		});
		expect(refreshMock).toHaveBeenCalledTimes(1);
		await act(async () => {
			message(data);
			await Promise.resolve();
		});
		expect(refreshMock).toHaveBeenCalledTimes(2);
	});
	it('만료 전에 자동 갱신하지만 중지한 뒤에는 갱신하지 않는다', async () => {
		render(<PluginConnectionBridge />);
		await connect();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(30_000);
		});
		expect(refreshMock).toHaveBeenCalledTimes(2);
		fireEvent.click(screen.getByRole('button', { name: '갱신 중지' }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(120_000);
			message({ type: 'rilog-import-auth-refresh', ...params });
		});
		expect(refreshMock).toHaveBeenCalledTimes(2);
	});
	it('컴포넌트를 제거하면 타이머와 메시지 이벤트를 정리한다', async () => {
		const { unmount } = render(<PluginConnectionBridge />);
		await connect();
		unmount();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(120_000);
			message({ type: 'rilog-import-auth-refresh', ...params });
		});
		expect(refreshMock).toHaveBeenCalledTimes(1);
	});
	it('연결 중 중지하면 늦게 도착한 토큰을 보내지 않는다', async () => {
		const delayed = Promise.withResolvers<ReturnType<typeof credentials>>();
		refreshMock.mockReturnValue(delayed.promise);
		render(<PluginConnectionBridge />);
		fireEvent.click(screen.getByRole('button', { name: '이 계정으로 연결' }));
		fireEvent.click(screen.getByRole('button', { name: '갱신 중지' }));
		await act(async () => {
			delayed.resolve(credentials());
			await delayed.promise;
		});
		expect(opener.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'rilog-import-auth-ready', ...params }, origin);
	});
	it('관리자 권한이 없으면 안전한 오류만 보내고 자동 갱신을 중단한다', async () => {
		refreshMock.mockRejectedValue(new PluginConnectionError('ADMIN_REQUIRED', '관리자 권한이 필요합니다.'));
		render(<PluginConnectionBridge />);
		await connect();
		expect(screen.getByText('관리자 권한이 필요합니다.')).toBeInTheDocument();
		expect(opener.postMessage).toHaveBeenCalledWith(
			{ type: 'rilog-import-auth-error', ...params, message: '관리자 권한이 필요합니다.', code: 'ADMIN_REQUIRED' },
			origin,
		);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(120_000);
		});
		expect(refreshMock).toHaveBeenCalledTimes(1);
	});
	it('요청 state가 잘못됐거나 opener가 없으면 인증 요청을 보내지 않는다', async () => {
		params.state = 'invalid';
		const { unmount } = render(<PluginConnectionBridge />);
		expect(screen.getByRole('alert')).toHaveTextContent('연결 요청이 올바르지 않습니다.');
		expect(refreshMock).not.toHaveBeenCalled();
		unmount();
		params.state = 'a'.repeat(64);
		Object.defineProperty(window, 'opener', { configurable: true, value: null });
		render(<PluginConnectionBridge />);
		await connect();
		expect(refreshMock).not.toHaveBeenCalled();
		expect(screen.getByRole('status')).toHaveTextContent('플러그인의 계정 연결 화면');
	});
	it('Rilog 계정이 바뀌면 자동 연결을 중단하고 명시적인 새 연결만 허용한다', async () => {
		render(<PluginConnectionBridge />);
		await connect();
		refreshMock.mockImplementation(() =>
			Promise.resolve({ ...credentials(), profile: { id: 4, nickname: '다른 계정', slug: 'other' } }),
		);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(30_000);
		});
		expect(
			opener.postMessage.mock.calls.filter(([raw]) => {
				const value: unknown = raw;
				return typeof value === 'object' && value !== null && 'type' in value && value.type === 'rilog-import-auth';
			}),
		).toHaveLength(1);
		expect(opener.postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: 'rilog-import-auth-error', code: 'ACCOUNT_CHANGED' }),
			origin,
		);
		expect(screen.getByRole('status')).toHaveTextContent('로그인 계정이 바뀌었습니다');
		await connect();
		expect(opener.postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: 'rilog-import-auth', profile: { id: 4, nickname: '다른 계정', slug: 'other' } }),
			origin,
		);
	});
	it('로그인은 별도 창에서 열어 원래 플러그인 opener를 보존한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://develop.rilog.kr');
		const openMock = vi.spyOn(window, 'open').mockReturnValue(null);
		refreshMock.mockRejectedValue(new PluginConnectionError('LOGIN_REQUIRED', 'Rilog에 먼저 로그인해 주세요.'));
		render(<PluginConnectionBridge />);
		await connect();
		fireEvent.click(screen.getByRole('button', { name: 'Rilog 로그인' }));
		expect(openMock).toHaveBeenCalledWith(
			'https://develop.rilog.kr/v1/auth/github?redirectUrl=/auth/github/callback',
			'_blank',
			'popup=yes,width=600,height=760,noopener,noreferrer',
		);
		expect(screen.getByRole('status')).toHaveTextContent('새 창에서 로그인한 뒤');
		expect(localStorage.length).toBe(0);
	});
	it('동시에 여러 갱신 요청이 오면 진행 중인 한 요청을 공유한다', async () => {
		const delayed = Promise.withResolvers<ReturnType<typeof credentials>>();
		refreshMock.mockReturnValue(delayed.promise);
		render(<PluginConnectionBridge />);
		fireEvent.click(screen.getByRole('button', { name: '이 계정으로 연결' }));
		act(() => {
			message({ type: 'rilog-import-auth-refresh', ...params });
			message({ type: 'rilog-import-auth-refresh', ...params });
		});
		expect(refreshMock).toHaveBeenCalledTimes(1);
		await act(async () => {
			delayed.resolve(credentials());
			await delayed.promise;
		});
		expect(opener.postMessage).toHaveBeenCalledTimes(2);
		expect(opener.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'rilog-import-auth' }), origin);
	});
	it('원래 연결 창이 닫히면 자동 갱신을 멈춘다', async () => {
		render(<PluginConnectionBridge />);
		await connect();
		opener.closed = true;
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60_000);
		});
		expect(refreshMock).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('status')).toHaveTextContent('연결 창이 닫혀');
	});
});
