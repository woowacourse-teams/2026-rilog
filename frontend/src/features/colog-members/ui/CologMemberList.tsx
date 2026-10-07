import type { ReactNode } from 'react';

import type { CologMemberSummary } from '@/domains/blog/model/colog';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import BlogProfileEntryLink from '@/features/analytics/ui/BlogProfileEntryLink';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import ProfileAsideList from '@/shared/ui/profile/ProfileAsideList';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

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
					<BlogProfileEntryLink
						href={buildBlogHomePath(stripAtPrefix(member.slug))}
						entrySource="colog_members"
						aria-label={`@${stripAtPrefix(member.slug)} 블로그로 이동`}
						className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
					>
						<UserAvatar
							src={member.profileImageUrl ?? undefined}
							fallback={member.nickname.slice(0, 1)}
							label={`${member.nickname} 프로필`}
							size="lg"
							className="bg-border-default"
						/>
					</BlogProfileEntryLink>
				</li>
			))}
			{action === undefined ? null : <li>{action}</li>}
		</ProfileAsideList>
	);
}
