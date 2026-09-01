import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

export const usersQueryKeys = {
	all: [...authenticatedQueryKeys.all, 'users'] as const,
	myInfo: () => [...usersQueryKeys.all, 'me'] as const,
	myCologsOverview: () => [...usersQueryKeys.all, 'me', 'cologs', 'overview'] as const,
	userBySlug: (slug: string) => [...usersQueryKeys.all, 'user-by-slug', slug] as const,
};
