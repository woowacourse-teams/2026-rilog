import { queryOptions } from '@tanstack/react-query';

import { readMyCologsOverview } from '../../api';
import { usersQueryKeys } from '../keys';

export const myCologsOverviewQueryOptions = () =>
	queryOptions({
		queryKey: usersQueryKeys.myCologsOverview(),
		queryFn: readMyCologsOverview,
		staleTime: 60_000,
	});
