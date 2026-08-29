'use client';

import { useState } from 'react';

import BlogManagementMenu from '@/features/blog-management/ui/BlogManagementMenu';
import { useCurrentCologPermission } from '@/features/colog-settings-access/hooks/use-current-colog-permission';
import { useLeaveCologMutation } from '@/shared/api/cologs/mutations/use-leave-colog-mutation';
import { buildCologSettingsPath } from '@/shared/routes/app-routes';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface CologSettingsButtonProps {
	isOnCover?: boolean;
	slug: string;
}

export default function CologSettingsButton({ isOnCover = false, slug }: CologSettingsButtonProps) {
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
	const permission = useCurrentCologPermission(slug);
	const leaveCologMutation = useLeaveCologMutation();
	const iconColor = isOnCover ? 'var(--text-on-dark)' : 'var(--text-secondary)';

	if (permission === undefined) {
		return null;
	}

	const handleLeaveRequest = () => {
		leaveCologMutation.reset();
		setIsLeaveModalOpen(true);
	};

	const handleLeaveCancel = () => {
		leaveCologMutation.reset();
		setIsLeaveModalOpen(false);
	};

	const handleLeaveConfirm = () => {
		leaveCologMutation.mutate(slug, {
			onSuccess: () => {
				setIsLeaveModalOpen(false);
			},
		});
	};

	return (
		<>
			<BlogManagementMenu
				ariaLabel="팀 블로그 메뉴"
				onLeave={handleLeaveRequest}
				settingsHref={permission === 'MEMBER' ? undefined : buildCologSettingsPath(slug, 'profile')}
				showLeave={permission !== 'OWNER'}
				triggerColor={iconColor}
			/>

			<ConfirmModal
				open={isLeaveModalOpen}
				title="팀을 탈퇴할까요?"
				description={`팀으로 발행한 모든 게시글이 팀 소유로 전환되며,\n본인이 수정하거나 삭제할 수 없습니다.`}
				confirmLabel="탈퇴"
				cancelLabel="취소"
				variant="danger"
				isPending={leaveCologMutation.isPending}
				onConfirm={handleLeaveConfirm}
				onCancel={handleLeaveCancel}
			/>
		</>
	);
}
