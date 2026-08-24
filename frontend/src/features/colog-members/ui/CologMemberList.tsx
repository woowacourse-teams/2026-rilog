import type { CologMemberSummary } from '@/domains/blog/model/colog';
import UserAvatar from '@/domains/user/ui/UserAvatar';

interface CologMemberListProps {
	members: readonly CologMemberSummary[];
}

export default function CologMemberList({ members }: CologMemberListProps) {
	return (
		<section aria-labelledby="colog-members-title">
			<h2 id="colog-members-title" className="text-label-2 font-semibold text-text-primary">
				Members
			</h2>
			{members.length === 0 ? (
				<p className="mt-4 text-label-2 font-medium text-text-secondary">아직 참여한 멤버가 없습니다.</p>
			) : (
				<ul className="mt-4 grid grid-cols-[repeat(5,max-content)] gap-1">
					{members.map((member) => (
						<li key={member.id}>
							<UserAvatar
								src={member.profileImageUrl ?? undefined}
								fallback={member.nickname.slice(0, 1)}
								label={`${member.nickname} 프로필`}
								slug={member.slug}
								size="lg"
								className="bg-border-default"
							/>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
