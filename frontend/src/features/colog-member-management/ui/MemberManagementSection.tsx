'use client';

import { useState } from 'react';

import type { FormEvent } from 'react';

import type { CologMemberPermission } from '@/domains/colog/model/colog-member';
import Button from '@/shared/ui/button/Button';

import { MOCK_COLOG_MEMBERS } from '../lib/mock-colog-members';

import CologMemberRow from './CologMemberRow';

export default function MemberManagementSection() {
	const [members, setMembers] = useState(() => MOCK_COLOG_MEMBERS.map((member) => ({ ...member })));
	const [draftMembers, setDraftMembers] = useState(() => members.map((member) => ({ ...member })));
	const [isEditing, setIsEditing] = useState(false);
	const displayedMembers = isEditing ? draftMembers : members;

	const handleStartEditing = () => {
		setDraftMembers(members.map((member) => ({ ...member })));
		setIsEditing(true);
	};

	const handleCancelEditing = () => {
		setDraftMembers(members.map((member) => ({ ...member })));
		setIsEditing(false);
	};

	const handleSave = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setMembers(draftMembers.map((member) => ({ ...member })));
		setIsEditing(false);
	};

	const handlePermissionChange = (memberId: number, permission: CologMemberPermission) => {
		setDraftMembers((currentMembers) =>
			currentMembers.map((member) => (member.id === memberId ? { ...member, permission } : member)),
		);
	};

	const handleBlogRoleChange = (memberId: number, blogRole: string) => {
		setDraftMembers((currentMembers) =>
			currentMembers.map((member) => (member.id === memberId ? { ...member, blogRole } : member)),
		);
	};

	return (
		<section aria-labelledby="member-management-title" className="h-full min-h-0">
			<form className="flex h-full min-h-0 flex-col" onSubmit={handleSave}>
				<div className="flex shrink-0 flex-wrap items-end justify-between gap-6">
					<div>
						<h1 id="member-management-title" className="text-heading-3 font-bold text-text-primary">
							멤버 관리
						</h1>
						<p className="mt-0.5 text-body-1 text-text-secondary">
							팀 멤버의 프로필, 역할, 권한과 참여 상태를 관리합니다.
						</p>
					</div>

					<div className="flex gap-1">
						{isEditing ? (
							<>
								<Button
									type="button"
									variant="secondary"
									size="md"
									className="w-30 px-2 text-label-1"
									onClick={handleCancelEditing}
								>
									취소
								</Button>
								<Button type="submit" size="md" className="w-30 px-2 text-label-1">
									저장
								</Button>
							</>
						) : (
							<>
								<Button
									type="button"
									variant="secondary"
									size="md"
									className="w-30 px-2 text-label-1"
									onClick={handleStartEditing}
								>
									멤버 정보 수정
								</Button>
								<Button type="button" size="md" className="w-30 px-2 text-label-1">
									+ 멤버 초대
								</Button>
							</>
						)}
					</div>
				</div>

				<div className="mt-14 min-h-0 flex-1 overflow-auto">
					<table className="w-full min-w-192 table-fixed border-collapse text-left">
						<caption className="sr-only">코로그 멤버 목록</caption>
						<colgroup>
							<col className="w-52" />
							<col className="w-31" />
							<col className="w-40" />
							<col className="w-37" />
							<col className="w-24" />
						</colgroup>
						<thead className="sticky top-0 z-10 bg-surface">
							<tr className="h-13.5 text-body-1 font-semibold text-text-secondary">
								<th scope="col" className="pl-6 font-semibold">
									멤버
								</th>
								<th scope="col" className="px-2 font-semibold">
									권한
								</th>
								<th scope="col" className="px-2 font-semibold">
									역할
								</th>
								<th scope="col" className="px-2 font-semibold">
									가입일
								</th>
								<th scope="col">
									<span className="sr-only">멤버 작업</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{displayedMembers.map((member) =>
								isEditing ? (
									<CologMemberRow
										key={member.id}
										member={member}
										isEditing
										onPermissionChange={handlePermissionChange}
										onBlogRoleChange={handleBlogRoleChange}
									/>
								) : (
									<CologMemberRow key={member.id} member={member} />
								),
							)}
						</tbody>
					</table>
				</div>
			</form>
		</section>
	);
}
