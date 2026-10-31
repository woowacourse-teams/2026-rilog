import { normalizeSentryRoute } from './sentry-route';

const BASE = 'https://www.rilog.kr';
const API_ORIGINS = new Set(['https://api.rilog.kr', 'https://api.rilog.test']);
const APP_ORIGINS = new Set([BASE, 'https://rilog.kr']);
const PAGE_KEYS = new Set(['page', 'size']);

/** Only bounded pagination numbers are known to be non-user-authored query values. */
export function safeDiagnosticQuery(value: unknown): URLSearchParams {
	const entries: unknown[] =
		typeof value === 'string'
			? [...new URLSearchParams(value)]
			: Array.isArray(value)
				? value
				: value && typeof value === 'object'
					? Object.entries(value)
					: [];
	const result = new URLSearchParams();
	for (const entry of entries) {
		if (!Array.isArray(entry) || entry.length !== 2) continue;
		const [key, item] = entry as unknown[];
		if (typeof key !== 'string' || !PAGE_KEYS.has(key) || typeof item !== 'string' || !/^\d{1,4}$/.test(item)) continue;
		result.set(key, item);
	}
	return result;
}

/** Preserve app routes, API request structure and trusted JS asset paths; never copy external object keys. */
export function safeDiagnosticUrl(value: string): string | null {
	if (!value || value.length > 4000 || (!value.startsWith('/') && !/^https?:\/\//i.test(value))) return null;
	try {
		const url = new URL(value, BASE);
		if (url.username || url.password) return null;
		const isLocal = /^https?:$/.test(url.protocol) && ['localhost', '127.0.0.1'].includes(url.hostname);
		if (!API_ORIGINS.has(url.origin) && !APP_ORIGINS.has(url.origin) && !isLocal) return null;
		let path = url.pathname;
		if (!API_ORIGINS.has(url.origin)) {
			const asset = /^\/_next\/static\/[\w./-]+\.(?:js|css|map)$/.test(path);
			path = asset ? path : (normalizeSentryRoute(path) ?? '/[path]');
		} else {
			path = path.replace(/(\/blogs\/)[^/]+/g, '$1[slug]').replace(/^(\/v\d+\/users\/)(?!me(?:\/|$))[^/]+/, '$1[slug]');
			path = path
				.split('/')
				.map((segment) => {
					let decoded: string;
					try {
						decoded = decodeURIComponent(segment);
					} catch {
						return '[value]';
					}
					return decoded.includes('@') ||
						/\.(?:png|jpe?g|gif|webp|heic|pdf|docx?|txt|csv|zip)$/i.test(decoded) ||
						decoded.length > 80
						? '[value]'
						: segment;
				})
				.join('/');
		}
		const query = safeDiagnosticQuery(url.search);
		return `${value.startsWith('/') && !value.startsWith('//') ? '' : url.origin}${path}${query.size ? `?${query}` : ''}`;
	} catch {
		return null;
	}
}

const ELEMENT =
	/^(a|button|input|textarea|select|option|form|label|div|span|p|li|ul|ol|section|article|nav|main|header|footer|svg|path|img)$/;
const INPUT_TYPE = /^(button|submit|reset|text|email|password|file|checkbox|radio|number|search|hidden|tel|url|date)$/;
const ROLE = /^(button|link|textbox|checkbox|radio|tab|menuitem|dialog|combobox|option)$/;

export function safeUiDetails(message?: string, supplied?: { element?: string; attributes?: Record<string, string> }) {
	const target = message?.split(/\s*>\s*/).at(-1) ?? '';
	const candidate = supplied?.element ?? target.match(/^([a-z][\w-]*)/i)?.[1]?.toLowerCase();
	const element = candidate && ELEMENT.test(candidate) ? candidate : undefined;
	const attributes: Record<string, string> = {};
	for (const [name, allowed] of [
		['type', INPUT_TYPE],
		['role', ROLE],
	] as const) {
		const value =
			supplied?.attributes?.[name] ??
			target
				.match(new RegExp(`\\[${name}=(?:"([^"]*)"|'([^']*)'|([^\\]]*))\\]`, 'i'))
				?.slice(1)
				.find((item) => item !== undefined);
		if (value && allowed.test(value)) attributes[name] = value;
	}
	return {
		...(element
			? {
					element,
					selector:
						element +
						Object.entries(attributes)
							.map(([name, value]) => `[${name}="${value}"]`)
							.join(''),
				}
			: {}),
		...(Object.keys(attributes).length ? { attributes } : {}),
	};
}

export function safePostHogReplayUrl(value: string): string | null {
	try {
		const url = new URL(value);
		const configured = process.env.NEXT_PUBLIC_POSTHOG_HOST ? new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST) : undefined;
		const configuredOrigin =
			configured?.protocol === 'https:' && !configured.username && !configured.password && !configured.port
				? configured.origin.replace(/\.i\.posthog\.com$/, '.posthog.com')
				: undefined;
		if (
			url.protocol !== 'https:' ||
			url.username ||
			url.password ||
			url.port ||
			url.hash ||
			![
				'https://posthog.com',
				'https://us.posthog.com',
				'https://eu.posthog.com',
				'https://app.posthog.com',
				configuredOrigin,
			].includes(url.origin)
		)
			return null;
		if (
			!/^\/project\/[A-Za-z0-9_-]{1,80}\/replay\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/.test(
				url.pathname,
			)
		)
			return null;
		if (
			[...url.searchParams].some(([key, item]) => key !== 't' || !/^\d{1,10}$/.test(item)) ||
			url.searchParams.getAll('t').length > 1
		)
			return null;
		return url.toString();
	} catch {
		return null;
	}
}
