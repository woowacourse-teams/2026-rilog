import { queryOptions } from '@tanstack/react-query';

import type { ReadUserBySlugResponse } from '@/shared/api/users/types';

import type { ApiResponse } from '@/shared/api/shared.types';

import { readUserBySlug } from '../../api';
import { usersQueryKeys } from '../keys';

export const userBySlugQueryOptions = (slug: string) =>
	queryOptions<ApiResponse<ReadUserBySlugResponse>>({
		queryKey: usersQueryKeys.userBySlug(slug),
		queryFn: () => readUserBySlug({ slug }),
		staleTime: 60_000,
		retry: false,
	});
