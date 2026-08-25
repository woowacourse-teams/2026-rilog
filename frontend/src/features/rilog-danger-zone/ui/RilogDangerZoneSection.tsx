'use client';

import { useState } from 'react';

import Button from '@/shared/ui/button/Button';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface RilogDangerZoneSectionProps {
	onWithdraw?: () => void;
}

export default function RilogDangerZoneSection({ onWithdraw }: RilogDangerZoneSectionProps) {
	const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

	const handleWithdrawConfirm = () => {
		onWithdraw?.();
		setIsWithdrawModalOpen(false);
	};

	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<div className="mt-2.5 rounded-lg bg-danger-soft px-6 py-10 sm:px-12 md:min-h-75 md:px-16 md:py-18">
				<h2 className="text-title-1 font-bold text-danger">계정 탈퇴</h2>
				<p className="mt-3 text-body-1 text-text-primary">
					계정을 탈퇴하면 개인 설정과 작성한 기록을 복구할 수 없습니다.
				</p>
				<Button
					type="button"
					variant="danger"
					size="md"
					className="mt-9 w-45"
					onClick={() => setIsWithdrawModalOpen(true)}
				>
					계정 탈퇴
				</Button>
			</div>

			<ConfirmModal
				open={isWithdrawModalOpen}
				title="계정을 탈퇴할까요?"
				description="탈퇴 후에는 계정과 개인 설정을 복구할 수 없습니다."
				confirmLabel="탈퇴"
				cancelLabel="취소"
				variant="danger"
				onConfirm={handleWithdrawConfirm}
				onCancel={() => setIsWithdrawModalOpen(false)}
			/>
		</section>
	);
}
