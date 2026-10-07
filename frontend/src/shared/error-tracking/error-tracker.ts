export interface ErrorTrackerContext {
	level?: 'error' | 'warning';
	tags?: Record<string, string>;
	contexts?: Record<string, Record<string, unknown>>;
	extra?: Record<string, unknown>;
}

export interface ErrorTracker {
	captureException(error: unknown, context?: ErrorTrackerContext): void;
	captureMessage(message: string, context?: ErrorTrackerContext): void;
	setUser(userId: string | null): void;
}
