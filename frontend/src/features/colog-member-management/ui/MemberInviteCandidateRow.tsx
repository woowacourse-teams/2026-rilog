import type { MemberInviteCandidate } from '../model/member-invite-candidate';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import Button from '@/shared/ui/button/Button';

interface MemberInviteCandidateRowProps {
	candidate: MemberInviteCandidate;
	onRemove: (slug: string) => void;
}

export default function MemberInviteCandidateRow({ candidate, onRemove }: MemberInviteCandidateRowProps) {
	return (
		<li className="flex min-h-15 items-center gap-3.5 border-b border-border-default py-2">
			<UserAvatar
				src={candidate.profileImageUrl}
				fallback=""
				label={`${candidate.nickname} 프로필 이미지`}
				size="lg"
				tone="subtle"
			/>

			<div className="min-w-0 flex-1">
				<strong className="block truncate text-label-1 font-semibold text-text-primary">{candidate.nickname}</strong>
				<span className="block truncate text-caption-1 text-text-secondary">@{candidate.slug}</span>
			</div>

			<Button
				type="button"
				size="icon"
				variant="ghost"
				aria-label={`${candidate.nickname} 초대 목록에서 제거`}
				onClick={() => onRemove(candidate.slug)}
			>
				<span aria-hidden="true">×</span>
			</Button>
		</li>
	);
}
