'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { removeCologMember } from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

interface RemoveCologMemberVariables {
	slug: string;
	memberId: number;
}

export const useRemoveCologMemberMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ slug, memberId }: RemoveCologMemberVariables) => removeCologMember(slug, memberId),
		onSuccess: (_, { slug }) =>
			queryClient.invalidateQueries({
				queryKey: cologsQueryKeys.members(stripAtPrefix(slug)),
				exact: true,
			}),
	});
};
