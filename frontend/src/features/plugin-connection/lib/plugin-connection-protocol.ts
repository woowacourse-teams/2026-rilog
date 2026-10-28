import type { PluginConnectionEnvironment } from '@/shared/api/auth/types';

export const RILOG_IMPORT_STUDIO_ORIGIN = 'https://rilog-import-studio.soonjae8297.chatgpt.site';

export interface PluginConnectionRequest {
	state: string;
	environment: PluginConnectionEnvironment;
}

export function parsePluginConnectionRequest(
	state: string | null,
	environment: string | null,
): PluginConnectionRequest | null {
	if (state === null || !/^[a-f0-9]{32,128}$/i.test(state)) return null;
	if (environment !== 'develop' && environment !== 'production') return null;
	return { state, environment };
}

export function getPluginStudioOrigin(): string {
	const configured = process.env.NEXT_PUBLIC_RILOG_IMPORT_STUDIO_ORIGIN;
	if (process.env.NODE_ENV !== 'development' || !configured) return RILOG_IMPORT_STUDIO_ORIGIN;
	try {
		const url = new URL(configured);
		if (
			url.protocol === 'http:' &&
			['localhost', '127.0.0.1'].includes(url.hostname) &&
			url.port === '4317' &&
			url.pathname === '/' &&
			!url.search &&
			!url.hash &&
			!url.username &&
			!url.password
		) {
			return url.origin;
		}
	} catch {
		// Keep the fixed trusted production origin when local configuration is malformed.
	}
	return RILOG_IMPORT_STUDIO_ORIGIN;
}

export function isPluginRefreshRequest(
	event: MessageEvent<unknown>,
	opener: Window,
	request: PluginConnectionRequest,
	studioOrigin: string,
): boolean {
	if (event.origin !== studioOrigin || event.source !== opener) return false;
	const value = event.data;
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		value.type === 'rilog-import-auth-refresh' &&
		'state' in value &&
		value.state === request.state &&
		'environment' in value &&
		value.environment === request.environment
	);
}

export function getPluginRefreshDelay(expiresAt: string, now = Date.now()): number {
	return Math.max(5_000, Date.parse(expiresAt) - now - 30_000);
}
