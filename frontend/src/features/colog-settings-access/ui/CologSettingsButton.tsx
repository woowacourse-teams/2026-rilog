'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import BlogManagementMenu from '@/features/blog-management/ui/BlogManagementMenu';
import { useCurrentCologPermission } from '@/features/colog-settings-access/hooks/use-current-colog-permission';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { useLeaveCologMutation } from '@/shared/api/cologs/mutations/use-leave-colog-mutation';
import { APP_ROUTES, buildCologSettingsPath } from '@/shared/routes/app-routes';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface CologSettingsButtonProps {
	isOnCover?: boolean;
	slug: string;
}

export default function CologSettingsButton({ isOnCover = false, slug }: CologSettingsButtonProps) {
	const router = useRouter();
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
				router.replace(APP_ROUTES.feeds);
			},
		});
	};

	const leaveErrorMessage = leaveCologMutation.isError
		? getApiErrorMessage(leaveCologMutation.error, '팀 블로그에서 탈퇴하지 못했어요. 다시 시도해 주세요.')
		: null;

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
				title="정말로 탈퇴할까요?"
				description={
					<>
						<span>탈퇴 후 다시 참여하려면 팀의 초대가 필요합니다.</span>
						{leaveErrorMessage !== null && (
							<span className="mt-2 block text-danger" role="alert">
								{leaveErrorMessage}
							</span>
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
		</>
	);
}
