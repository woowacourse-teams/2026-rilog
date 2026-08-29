import type { CologMember, CologMemberPermission } from '@/domains/blog/model/colog';
import UserAvatar from '@/domains/user/ui/UserAvatar';

const PERMISSION_LABELS: Record<CologMemberPermission, string> = {
	OWNER: 'Owner',
	ADMIN: 'Admin',
	MEMBER: 'Member',
};

const JOINED_AT_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	timeZone: 'Asia/Seoul',
});

interface CologMemberRowProps {
	member: CologMember;
	isEditing?: boolean;
	onPermissionChange?: (memberId: number, permission: CologMemberPermission) => void;
	onBlogRoleChange?: (memberId: number, blogRole: string) => void;
	onRemove?: () => void;
}

export default function CologMemberRow({
	member,
	isEditing = false,
	onPermissionChange,
	onBlogRoleChange: _onBlogRoleChange,
	onRemove,
}: CologMemberRowProps) {
	const joinedAt = JOINED_AT_FORMATTER.format(new Date(member.joinedAt)).replace(/\.$/, '');

	return (
		<tr className="h-18.5 border-b border-border-default">
			<td className="py-3 pl-6">
				<div className="flex items-center gap-3.5">
					<UserAvatar
						src={member.profileImageUrl}
						fallback=""
						label={`${member.nickname} 프로필 이미지`}
						size="lg"
						tone="subtle"
					/>
					<div className="min-w-0">
						<strong className="block truncate text-body-1 font-semibold text-text-primary">{member.nickname}</strong>
						<span className="block truncate text-caption-2 text-text-secondary">@{member.slug}</span>
					</div>
				</div>
			</td>
			<td className="px-2 py-3 text-body-1 font-semibold text-brand-primary">
				{isEditing ? (
					<select
						aria-label={`${member.nickname} 권한`}
						value={member.permission}
						onChange={(event) => onPermissionChange?.(member.id, event.target.value as CologMemberPermission)}
						className="h-height-md w-full rounded-md border border-border-default bg-white px-3 text-label-2 text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-focus-ring"
					>
						{Object.entries(PERMISSION_LABELS).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				) : (
					PERMISSION_LABELS[member.permission]
				)}
			</td>
			{/* <td className="px-2 py-3 text-body-1 text-text-primary">
				{isEditing ? (
					<Input
						aria-label={`${member.nickname} 역할`}
						value={member.blogRole}
						onChange={(event) => onBlogRoleChange?.(member.id, event.target.value)}
						className="px-3"
					/>
				) : (
					member.blogRole
				)}
			</td> */}
			<td className="px-2 py-3 text-label-1 text-text-secondary">{joinedAt}</td>
			<td className="py-3 pr-8 text-right">
				<button
					type="button"
					aria-label={`${member.nickname} 멤버 내보내기`}
					disabled={isEditing}
					onClick={onRemove}
					className="inline-flex size-6 items-center justify-center rounded-full bg-surface-active text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-focus-ring"
				>
					<span aria-hidden="true" className="text-body-2 leading-none font-bold">
						−
					</span>
				</button>
			</td>
		</tr>
	);
}
