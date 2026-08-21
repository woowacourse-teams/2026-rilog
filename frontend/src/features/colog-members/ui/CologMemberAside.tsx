'use client';

import { useCologMembersQuery } from '@/shared/api/cologs/queries/members/use-query';
import Button from '@/shared/ui/button/Button';

import { mapCologMemberResponse } from '@/features/colog-member-management/lib/map-colog-member-response';

import CologMemberList from './CologMemberList';

interface CologMemberAsideProps {
	slug: string;
}

export default function CologMemberAside({ slug }: CologMemberAsideProps) {
	const membersQuery = useCologMembersQuery({ slug });

	if (membersQuery.isPending) {
		return (
			<p className="text-label-2 font-medium text-text-secondary" role="status">
				멤버 목록을 불러오는 중...
			</p>
		);
	}

	if (membersQuery.isError) {
		return (
			<div className="flex flex-col items-start gap-3" role="alert">
				<p className="text-label-2 font-medium text-text-secondary">멤버 목록을 불러오지 못했어요.</p>
				<Button variant="secondary" size="sm" onClick={() => void membersQuery.refetch()}>
					다시 시도
				</Button>
			</div>
		);
	}

	const members = membersQuery.data?.data?.map(mapCologMemberResponse) ?? [];

	return <CologMemberList members={members} />;
}
