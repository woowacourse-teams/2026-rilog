'use client';

import { useState } from 'react';

import type { FormEvent } from 'react';

import type { CologMember, CologMemberPermission } from '@/domains/blog/model/colog';

export type CologMemberDraft = Pick<CologMember, 'id' | 'permission' | 'blogRole'>;
export type CologMemberDraftChange = Partial<Pick<CologMember, 'permission' | 'blogRole'>>;

interface UseCologMemberDraftsOptions {
	initialMembers?: CologMember[];
	isInviteModalInitiallyOpen?: boolean;
}

export function useCologMemberDrafts({
	initialMembers,
	isInviteModalInitiallyOpen = false,
}: UseCologMemberDraftsOptions = {}) {
	const [draftMembers, setDraftMembers] = useState<CologMemberDraft[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(isInviteModalInitiallyOpen);
	const members = initialMembers ?? [];
	const applicableDraftMembers = draftMembers.filter((draft) => members.some((member) => member.id === draft.id));
	const isDirty = applicableDraftMembers.length > 0;

	const displayedMembers = members.map((member) => {
		const draftMember = applicableDraftMembers.find((draft) => draft.id === member.id);
		return draftMember === undefined ? member : { ...member, ...draftMember };
	});

	const handleStartEditing = () => {
		setDraftMembers([]);
		setIsEditing(true);
	};

	const handleCancelEditing = () => {
		setDraftMembers([]);
		setIsEditing(false);
	};

	const handleSave = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// TODO: 멤버 수정 API 연동 후 mutation 성공 시 query cache를 갱신한다.
		setDraftMembers([]);
		setIsEditing(false);
	};

	const updateDraftMember = (memberId: number, change: CologMemberDraftChange) => {
		const originalMember = members.find((member) => member.id === memberId);
		if (originalMember === undefined) {
			return;
		}

		setDraftMembers((currentDrafts) => {
			const currentDraft = currentDrafts.find((draft) => draft.id === memberId);
			const nextDraft: CologMemberDraft = {
				id: memberId,
				permission: currentDraft?.permission ?? originalMember.permission,
				blogRole: currentDraft?.blogRole ?? originalMember.blogRole,
				...change,
			};

			if (nextDraft.permission === originalMember.permission && nextDraft.blogRole === originalMember.blogRole) {
				return currentDrafts.filter((draft) => draft.id !== memberId);
			}

			if (currentDraft === undefined) {
				return [...currentDrafts, nextDraft];
			}

			return currentDrafts.map((draft) => (draft.id === memberId ? nextDraft : draft));
		});
	};

	const handlePermissionChange = (memberId: number, permission: CologMemberPermission) => {
		updateDraftMember(memberId, { permission });
	};

	const handleBlogRoleChange = (memberId: number, blogRole: string) => {
		updateDraftMember(memberId, { blogRole });
	};

	return {
		members,
		displayedMembers,
		draftMembers: applicableDraftMembers,
		isEditing,
		isDirty,
		isInviteModalOpen,
		setIsInviteModalOpen,
		handleStartEditing,
		handleCancelEditing,
		handleSave,
		handlePermissionChange,
		handleBlogRoleChange,
	};
}
