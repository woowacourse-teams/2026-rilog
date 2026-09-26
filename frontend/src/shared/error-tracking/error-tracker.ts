export interface ErrorTrackerContext {
	level?: 'error' | 'warning';
	tags?: Record<string, string>;
	extra?: Record<string, unknown>;
}

export interface ErrorTracker {
	captureException(error: unknown, context?: ErrorTrackerContext): void;
	captureMessage(message: string, context?: ErrorTrackerContext): void;
}
