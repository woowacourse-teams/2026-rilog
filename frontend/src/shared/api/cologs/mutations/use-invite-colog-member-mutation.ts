import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inviteCologMember } from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';
import type { CologMemberInviteRequest } from '@/shared/api/cologs/types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

interface InviteCologMemberVariables {
	slug: string;
	request: CologMemberInviteRequest;
}

export const useInviteCologMemberMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ slug, request }: InviteCologMemberVariables) => inviteCologMember(slug, request),
		onSuccess: (_, { slug }) =>
			queryClient.invalidateQueries({
				queryKey: cologsQueryKeys.members(stripAtPrefix(slug)),
				exact: true,
			}),
	});
};
