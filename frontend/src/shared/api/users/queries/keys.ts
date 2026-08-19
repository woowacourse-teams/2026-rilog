import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

export const usersQueryKeys = {
	all: [...authenticatedQueryKeys.all, 'users'] as const,
	myInfo: () => [...usersQueryKeys.all, 'me'] as const,
	myCologsPreview: () => [...usersQueryKeys.all, 'me', 'cologs', 'preview'] as const,
};
