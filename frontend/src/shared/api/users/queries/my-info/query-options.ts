import { queryOptions } from '@tanstack/react-query';

import { readMyInfo } from '../../api';
import { usersQueryKeys } from '../keys';

export const myInfoQueryOptions = () =>
	queryOptions({
		queryKey: usersQueryKeys.myInfo(),
		queryFn: readMyInfo,
		staleTime: Infinity,
	});
