export const usersQueryKeys = {
	all: ['users'] as const,
	myInfo: () => [...usersQueryKeys.all, 'me'] as const,
	myCologsPreview: () => [...usersQueryKeys.all, 'me', 'cologs', 'preview'] as const,
};
