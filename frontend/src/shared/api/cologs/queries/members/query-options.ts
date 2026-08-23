import { queryOptions } from '@tanstack/react-query';

import type { BlogMemberResponse } from '@/shared/api/cologs/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

import { readCologMembers } from '../../api';
import { cologsQueryKeys } from '../keys';

export const cologMembersQueryOptions = (slug: string) => {
	const normalizedSlug = stripAtPrefix(slug);

	return queryOptions<ApiResponse<BlogMemberResponse[]>>({
		queryKey: cologsQueryKeys.members(normalizedSlug),
		queryFn: () => readCologMembers(normalizedSlug),
		retry: false,
	});
};
