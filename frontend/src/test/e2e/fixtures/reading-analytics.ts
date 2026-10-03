export interface CapturedReadingEvent {
	name: string;
	properties: Record<string, unknown>;
}

declare global {
	interface Window {
		readingEvents: CapturedReadingEvent[];
	}
}

const capture = (name: string, properties: Record<string, unknown>) => {
	window.readingEvents.push({ name, properties });
};

export const analytics = {
	postDetailViewed: (properties: Record<string, unknown>) => capture('post detail viewed', properties),
	postReadEngaged: (properties: Record<string, unknown>) => capture('post read engaged', properties),
	postReadQualified: (properties: Record<string, unknown>) => capture('post read qualified', properties),
};
