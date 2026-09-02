import type { ReactNode } from 'react';

import type { CologMemberSummary } from '@/domains/blog/model/colog';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import UserBlogLink from '@/domains/user/ui/UserBlogLink';
import ProfileAsideList from '@/shared/ui/profile/ProfileAsideList';

interface CologMemberListProps {
	members: readonly CologMemberSummary[];
	action?: ReactNode;
}

export default function CologMemberList({ members, action }: CologMemberListProps) {
	return (
		<ProfileAsideList
			title="Members"
			isEmpty={members.length === 0 && action === undefined}
			emptyMessage="아직 참여한 멤버가 없습니다."
		>
			{members.map((member) => (
				<li key={member.id}>
					<UserBlogLink slug={member.slug}>
						<UserAvatar
							src={member.profileImageUrl ?? undefined}
							fallback={member.nickname.slice(0, 1)}
							label={`${member.nickname} 프로필`}
							size="lg"
							className="bg-border-default"
						/>
					</UserBlogLink>
				</li>
			))}
			{action === undefined ? null : <li>{action}</li>}
		</ProfileAsideList>
	);
}
