import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

import { mapCurrentMemberUserResponse } from '../lib/map-current-member-user-response';

export function useCurrentMemberUser({ isEnabled }: { isEnabled?: boolean } = {}) {
	return useMyInfoQuery({ select: mapCurrentMemberUserResponse, isEnabled });
}
