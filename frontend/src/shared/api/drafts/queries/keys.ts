export const draftsQueryKeys = {
	all: ['drafts'] as const,
	myList: (size: number) => [...draftsQueryKeys.all, 'me', { size }] as const,
};
