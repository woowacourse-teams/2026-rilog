export type SentrySlackMode = 'webhook' | 'off';

/** Delivery requires an explicit server-side webhook opt-in. */
export function resolveSentrySlackMode(value: string | undefined): SentrySlackMode {
	return value === 'webhook' ? 'webhook' : 'off';
}
