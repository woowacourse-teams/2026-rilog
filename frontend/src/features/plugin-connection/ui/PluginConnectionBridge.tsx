'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	getPluginRefreshDelay,
	getPluginStudioOrigin,
	isPluginRefreshRequest,
	parsePluginConnectionRequest,
} from '@/features/plugin-connection/lib/plugin-connection-protocol';
import { getPluginConnectionApiBase, PluginConnectionError, refreshPluginConnection } from '@/shared/api/auth/api';
import type { PluginConnectionProfile } from '@/shared/api/auth/types';
import Button from '@/shared/ui/button/Button';

interface BridgeView {
	status: 'idle' | 'pending' | 'connected' | 'error' | 'stopped';
	message: string;
	profile?: PluginConnectionProfile;
	errorCode?: string;
}

const INITIAL_VIEW: BridgeView = {
	status: 'idle',
	message: '본인 관리자 계정으로 연결하면 이 창이 열려 있는 동안 인증을 갱신합니다.',
};

export default function PluginConnectionBridge() {
	const params = useSearchParams();
	const state = params.get('state');
	const environment = params.get('environment');
	const request = useMemo(() => parsePluginConnectionRequest(state, environment), [state, environment]);
	const studioOrigin = getPluginStudioOrigin();
	const [view, setView] = useState<BridgeView>(INITIAL_VIEW);
	const openerRef = useRef<Window | null>(null);
	const authorizedRef = useRef(false);
	const profileIdRef = useRef<number | null>(null);
	const generationRef = useRef(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const flightRef = useRef<Promise<void> | null>(null);

	const clearRefreshTimer = useCallback(() => {
		if (timerRef.current !== null) clearTimeout(timerRef.current);
		timerRef.current = null;
	}, []);

	const refresh = useCallback(
		function refreshConnection(): Promise<void> {
			if (flightRef.current !== null) return flightRef.current;
			if (request === null || !authorizedRef.current) return Promise.resolve();
			const generation = generationRef.current;
			const opener = openerRef.current;
			if (opener === null || opener.closed) {
				authorizedRef.current = false;
				setView({ status: 'error', message: '플러그인의 계정 연결 화면에서 이 창을 다시 열어 주세요.' });
				return Promise.resolve();
			}
			clearRefreshTimer();
			setView((current) => ({ ...current, status: 'pending', message: 'Rilog 관리자 계정을 확인하고 있습니다.' }));
			const pending = (async () => {
				try {
					const credentials = await refreshPluginConnection(request.environment);
					if (generation !== generationRef.current || !authorizedRef.current || opener.closed) return;
					if (profileIdRef.current !== null && profileIdRef.current !== credentials.profile.id) {
						throw new PluginConnectionError(
							'ACCOUNT_CHANGED',
							'Rilog 로그인 계정이 바뀌었습니다. 새 계정으로 연결하려면 다시 연결을 눌러 주세요.',
						);
					}
					profileIdRef.current = credentials.profile.id;
					opener.postMessage({ type: 'rilog-import-auth', ...request, ...credentials }, studioOrigin);
					setView({
						status: 'connected',
						message: '관리자 인증을 확인했습니다. 플러그인에서 연결 상태를 확인해 주세요.',
						profile: credentials.profile,
					});
					timerRef.current = setTimeout(() => {
						// refresh handles its own rejection and reports only sanitized errors.
						void refreshConnection();
					}, getPluginRefreshDelay(credentials.expiresAt));
				} catch (error) {
					if (generation !== generationRef.current || !authorizedRef.current) return;
					authorizedRef.current = false;
					const safe =
						error instanceof PluginConnectionError
							? error
							: new PluginConnectionError('API_UNAVAILABLE', 'Rilog 연결을 확인하지 못했습니다. 다시 시도해 주세요.');
					if (!opener.closed) {
						opener.postMessage(
							{ type: 'rilog-import-auth-error', ...request, message: safe.message, code: safe.code },
							studioOrigin,
						);
					}
					setView({ status: 'error', message: safe.message, errorCode: safe.code });
				} finally {
					flightRef.current = null;
				}
			})();
			flightRef.current = pending;
			return pending;
		},
		[clearRefreshTimer, request, studioOrigin],
	);

	useEffect(() => {
		// The DOM types leave opener as any; browsers expose a WindowProxy or null here.
		const opener = window.opener as Window | null;
		openerRef.current = opener;
		if (request !== null && opener !== null && !opener.closed) {
			// This public readiness signal lets the parent distinguish a loaded bridge from a missing route.
			opener.postMessage({ type: 'rilog-import-auth-ready', ...request }, studioOrigin);
		}
		const handleMessage = (event: MessageEvent<unknown>) => {
			if (opener === null || request === null || !authorizedRef.current) return;
			if (isPluginRefreshRequest(event, opener, request, studioOrigin)) void refresh();
		};
		const watchOpener =
			request !== null && opener !== null
				? setInterval(() => {
						if (opener !== null && opener.closed && authorizedRef.current) {
							authorizedRef.current = false;
							generationRef.current += 1;
							clearRefreshTimer();
							setView({ status: 'stopped', message: '플러그인 연결 창이 닫혀 인증 갱신을 중지했습니다.' });
						}
					}, 1_000)
				: null;
		window.addEventListener('message', handleMessage);
		return () => {
			authorizedRef.current = false;
			generationRef.current += 1;
			clearRefreshTimer();
			if (watchOpener !== null) clearInterval(watchOpener);
			window.removeEventListener('message', handleMessage);
		};
	}, [clearRefreshTimer, refresh, request, studioOrigin]);

	const connect = () => {
		if (flightRef.current !== null) return;
		if (view.status !== 'connected') profileIdRef.current = null;
		authorizedRef.current = true;
		void refresh();
	};
	const stop = () => {
		authorizedRef.current = false;
		generationRef.current += 1;
		clearRefreshTimer();
		setView({
			status: 'stopped',
			message: '이 창의 인증 갱신을 중지했습니다. 연결 해제는 플러그인에서 할 수 있습니다.',
		});
	};
	const apiBase = request === null ? null : getPluginConnectionApiBase(request.environment);
	const canLogin = apiBase !== null && process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') === apiBase;
	const login = () => {
		if (apiBase === null || !canLogin) return;
		// Keep this bridge's opener intact: GitHub can isolate a window with COOP.
		window.open(
			`${apiBase}/v1/auth/github?redirectUrl=/auth/github/callback`,
			'_blank',
			'popup=yes,width=600,height=760,noopener,noreferrer',
		);
		setView({
			status: 'error',
			errorCode: 'LOGIN_REQUIRED',
			message: '새 창에서 로그인한 뒤 이 창에서 다시 연결해 주세요.',
		});
	};

	return (
		<main className="min-h-dvh bg-background px-4 py-10 text-text-primary">
			<section className="mx-auto max-w-xl rounded-xl border border-border-default bg-surface p-6 sm:p-8">
				<p className="mb-3 text-label-1 font-semibold text-text-secondary">Rilog. Import Studio</p>
				<h1 className="text-heading-4 font-extrabold">Rilog 관리자 계정 연결</h1>
				{request === null ? (
					<p role="alert" className="mt-5 text-body-3 text-danger">
						연결 요청이 올바르지 않습니다. 플러그인에서 계정 연결을 다시 눌러 주세요.
					</p>
				) : (
					<>
						<p className="mt-4 text-body-3 text-text-secondary">
							{request.environment === 'develop' ? '개발 서버' : '운영 서버'}의 본인 계정으로 연결합니다. 비밀번호와
							갱신 쿠키는 이 Rilog 창에서만 사용합니다.
						</p>
						<div role="status" aria-live="polite" className="mt-5 rounded-lg bg-surface-hover p-4 text-body-3">
							{view.profile ? (
								<p className="mb-2 font-semibold">{`${view.profile.nickname} (@${view.profile.slug})`}</p>
							) : null}
							<p>{view.message}</p>
						</div>
						{view.status === 'connected' ? (
							<p className="mt-4 text-label-1 text-text-secondary">
								플러그인을 사용하는 동안 이 창을 열어 두세요. 토큰을 직접 복사할 필요가 없습니다.
							</p>
						) : null}
						<div className="mt-6 flex flex-wrap gap-3">
							<Button onClick={connect} isPending={view.status === 'pending'}>
								{view.status === 'connected' ? '지금 갱신' : '이 계정으로 연결'}
							</Button>
							{view.status === 'connected' || view.status === 'pending' ? (
								<Button onClick={stop} variant="secondary">
									갱신 중지
								</Button>
							) : null}
							{view.errorCode === 'LOGIN_REQUIRED' && canLogin ? (
								<Button onClick={login} variant="secondary">
									Rilog 로그인
								</Button>
							) : null}
						</div>
						{view.errorCode === 'LOGIN_REQUIRED' && !canLogin ? (
							<p className="mt-4 text-label-1 text-text-secondary">
								선택한 API와 같은 환경의 Rilog 프론트에서 먼저 로그인해 주세요. 개발 계정은 개발 API에 연결된 프론트가
								필요합니다.
							</p>
						) : null}
					</>
				)}
			</section>
		</main>
	);
}
