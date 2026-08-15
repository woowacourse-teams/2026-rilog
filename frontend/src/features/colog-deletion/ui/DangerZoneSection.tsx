'use client';

import { useState } from 'react';

import Button from '@/shared/ui/button/Button';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface DangerZoneSectionProps {
	onDeleteTeam?: () => void;
}

export default function DangerZoneSection({ onDeleteTeam }: DangerZoneSectionProps) {
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	const handleDeleteConfirm = () => {
		onDeleteTeam?.();
		setIsDeleteModalOpen(false);
	};

	return (
		<section aria-labelledby="danger-settings-title" className="h-full min-h-0 overflow-y-auto pb-24">
			<h1 id="danger-settings-title" className="text-heading-3 font-bold text-text-primary">
				위험 영역
			</h1>
			<p className="mt-0.5 text-body-1 text-text-secondary">
				되돌릴 수 없는 작업입니다. 진행하기 전에 내용을 확인해 주세요.
			</p>

			<div className="mt-2.5 rounded-lg bg-danger-soft px-6 py-10 sm:px-12 md:min-h-75 md:px-16 md:py-18">
				<h2 className="text-title-1 font-bold text-danger">팀 삭제</h2>
				<p className="mt-3 text-body-1 text-text-primary">
					팀과 팀의 모든 설정이 영구적으로 삭제됩니다. 게시글은 작성자 개인 글로 전환되며, 이 작업은 취소할 수 없습니다.
				</p>
				<Button
					type="button"
					variant="danger"
					size="lg"
					className="mt-9 w-45"
					onClick={() => setIsDeleteModalOpen(true)}
				>
					팀 영구 삭제
				</Button>
			</div>

			<ConfirmModal
				open={isDeleteModalOpen}
				title="팀을 영구 삭제할까요?"
				description="삭제된 팀과 설정은 복구할 수 없습니다."
				confirmLabel="영구 삭제"
				cancelLabel="취소"
				variant="danger"
				onConfirm={handleDeleteConfirm}
				onCancel={() => setIsDeleteModalOpen(false)}
			/>
		</section>
	);
}
