export const usersQueryKeys = {
	all: ['users'] as const,
	myCologsPreview: () => [...usersQueryKeys.all, 'me', 'cologs', 'preview'] as const,
};
