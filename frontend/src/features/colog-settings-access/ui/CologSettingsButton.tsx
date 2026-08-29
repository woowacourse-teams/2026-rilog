'use client';

import { useState } from 'react';

import BlogManagementMenu from '@/features/blog-management/ui/BlogManagementMenu';
import { useCurrentCologPermission } from '@/features/colog-settings-access/hooks/use-current-colog-permission';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { useLeaveCologMutation } from '@/shared/api/cologs/mutations/use-leave-colog-mutation';
import { buildCologSettingsPath } from '@/shared/routes/app-routes';
import AlertModal from '@/shared/ui/modal/AlertModal';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface CologSettingsButtonProps {
	isOnCover?: boolean;
	slug: string;
}

const LEAVE_ERROR_FALLBACK_MESSAGE = '팀 블로그에서 탈퇴하지 못했어요. 다시 시도해 주세요.';

export default function CologSettingsButton({ isOnCover = false, slug }: CologSettingsButtonProps) {
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
	const [isLeaveCompleteModalOpen, setIsLeaveCompleteModalOpen] = useState(false);
	const permission = useCurrentCologPermission(slug);
	const leaveCologMutation = useLeaveCologMutation();
	const iconColor = isOnCover ? 'var(--text-on-dark)' : 'var(--text-secondary)';
	const leaveErrorMessage = leaveCologMutation.isError
		? getApiErrorMessage(leaveCologMutation.error, LEAVE_ERROR_FALLBACK_MESSAGE)
		: undefined;

	if (permission === undefined && !isLeaveCompleteModalOpen) {
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
				setIsLeaveCompleteModalOpen(true);
			},
		});
	};

	return (
		<>
			{permission === undefined ? null : (
				<BlogManagementMenu
					ariaLabel="팀 블로그 메뉴"
					onLeave={handleLeaveRequest}
					settingsHref={permission === 'MEMBER' ? undefined : buildCologSettingsPath(slug, 'profile')}
					showLeave={permission !== 'OWNER'}
					triggerColor={iconColor}
				/>
			)}

			<ConfirmModal
				open={isLeaveModalOpen}
				title="팀을 탈퇴할까요?"
				description={
					<>
						<span>
							팀으로 발행한 모든 게시글이 팀 소유로 전환되며,
							<br />
							본인이 수정하거나 삭제할 수 없습니다.
						</span>
						{leaveErrorMessage === undefined ? null : (
							<span className="mt-2 block text-danger">{leaveErrorMessage}</span>
						)}
					</>
				}
				confirmLabel="탈퇴"
				cancelLabel="취소"
				variant="danger"
				isPending={leaveCologMutation.isPending}
				onConfirm={handleLeaveConfirm}
				onCancel={handleLeaveCancel}
			/>

			<AlertModal
				open={isLeaveCompleteModalOpen}
				title="탈퇴가 완료되었습니다."
				onAction={() => undefined}
				onClose={() => setIsLeaveCompleteModalOpen(false)}
			/>
		</>
	);
}
