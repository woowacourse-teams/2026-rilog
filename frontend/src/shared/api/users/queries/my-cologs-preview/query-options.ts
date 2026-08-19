import { queryOptions } from '@tanstack/react-query';

import { readMyCologsPreview } from '../../api';
import { usersQueryKeys } from '../keys';

export const myCologsPreviewQueryOptions = () =>
	queryOptions({
		queryKey: usersQueryKeys.myCologsPreview(),
		queryFn: readMyCologsPreview,
		staleTime: 60_000,
	});
