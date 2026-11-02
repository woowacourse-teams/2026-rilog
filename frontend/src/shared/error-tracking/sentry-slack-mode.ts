export type SentrySlackMode = 'legacy' | 'webhook' | 'off';

/** Preserve legacy delivery until the operator has verified the replacement. */
export function resolveSentrySlackMode(value: string | undefined): SentrySlackMode {
	if (value === undefined || value === '' || value === 'legacy') return 'legacy';
	return value === 'webhook' ? 'webhook' : 'off';
}
