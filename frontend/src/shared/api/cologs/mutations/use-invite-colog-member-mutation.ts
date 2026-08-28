import { useMutation } from '@tanstack/react-query';

import { inviteCologMember } from '@/shared/api/cologs/api';
import type { CologMemberInviteRequest } from '@/shared/api/cologs/types';

interface InviteCologMemberVariables {
	slug: string;
	request: CologMemberInviteRequest;
}

export const useInviteCologMemberMutation = () =>
	useMutation({
		mutationFn: ({ slug, request }: InviteCologMemberVariables) => inviteCologMember(slug, request),
	});
