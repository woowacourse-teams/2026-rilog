import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inviteCologMember } from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';
import type { CologMemberInviteRequest } from '@/shared/api/cologs/types';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

interface InviteCologMemberVariables {
	slug: string;
	request: CologMemberInviteRequest;
}

export const useInviteCologMemberMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ slug, request }: InviteCologMemberVariables) => inviteCologMember(slug, request),
		meta: { errorTracking: 'local' },
		onError: (error) => apiErrorReporter.report(error, { operation: 'colog.invite' }),
		onSuccess: (_, { slug }) =>
			queryClient.invalidateQueries({
				queryKey: cologsQueryKeys.members(stripAtPrefix(slug)),
				exact: true,
			}),
	});
};
