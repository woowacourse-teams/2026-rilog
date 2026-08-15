export const POST_CATEGORY_OPTIONS = [
	{ value: 'IT', label: 'IT' },
	{ value: 'DAILY', label: '일상' },
] as const;

export type PostCategory = (typeof POST_CATEGORY_OPTIONS)[number]['value'];
