'use client';

import { analytics } from '@/features/analytics/model/events';
import { buildCologMemberInvitePath } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

interface CologMemberInviteButtonProps {
	slug: string;
}

export default function CologMemberInviteButton({ slug }: CologMemberInviteButtonProps) {
	return (
		<ButtonLink
			href={buildCologMemberInvitePath(slug)}
			aria-label="멤버 추가"
			variant="secondary"
			size="icon"
			className="rounded-full! border-dashed bg-white text-title-1"
			onClick={() => analytics.cologMemberInvitationEntryClicked({ entrySource: 'member_aside' })}
		>
			<span aria-hidden="true">+</span>
		</ButtonLink>
	);
}
