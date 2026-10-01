import { useReadUserBySlugMutation } from '@/shared/api/users/mutations/use-read-user-by-slug-mutation';

import { mapMemberInviteCandidateResponse } from '../lib/map-member-invite-candidate-response';

export function useMemberInviteData() {
	const mutation = useReadUserBySlugMutation();

	const readCandidateBySlug = async (slug: string) => {
		const response = await mutation.mutateAsync(slug);
		return mapMemberInviteCandidateResponse(response);
	};

	return {
		readCandidateBySlug,
		isReadingCandidate: mutation.isPending,
	};
}
