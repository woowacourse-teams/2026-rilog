'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/api-error';
import { useDeleteCologMutation } from '@/shared/api/cologs/mutations/use-delete-colog-mutation';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface CologDangerZoneSectionProps {
	slug: string;
}

const DELETE_COLOG_ERROR_FALLBACK_MESSAGE = '팀을 삭제하지 못했어요. 다시 시도해 주세요.';

export default function CologDangerZoneSection({ slug }: CologDangerZoneSectionProps) {
	const router = useRouter();
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const deleteCologMutation = useDeleteCologMutation();
	const deleteCologErrorMessage = deleteCologMutation.isError
		? getApiErrorMessage(deleteCologMutation.error, DELETE_COLOG_ERROR_FALLBACK_MESSAGE)
		: undefined;

	const handleDeleteConfirm = () => {
		deleteCologMutation.mutate(slug, {
			onSuccess: () => {
				setIsDeleteModalOpen(false);
				router.replace(APP_ROUTES.feeds);
			},
		});
	};

	const handleDeleteRequest = () => {
		deleteCologMutation.reset();
		setIsDeleteModalOpen(true);
	};

	const handleDeleteCancel = () => {
		deleteCologMutation.reset();
		setIsDeleteModalOpen(false);
	};

	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<div className="mt-2.5 rounded-lg bg-danger-soft px-6 py-10 sm:px-12 md:min-h-75 md:px-16 md:py-18">
				<h2 className="text-title-1 font-bold text-danger">팀 삭제</h2>
				<p className="mt-3 text-body-1 text-text-primary">팀과 팀의 게시글이 영구적으로 삭제됩니다.</p>
				<Button type="button" variant="danger" size="md" className="mt-9 w-45" onClick={handleDeleteRequest}>
					팀 영구 삭제
				</Button>
			</div>

			<ConfirmModal
				open={isDeleteModalOpen}
				title="팀을 영구 삭제할까요?"
				description={
					<>
						<span>삭제된 팀과 게시글은 복구할 수 없습니다.</span>
						{deleteCologErrorMessage === undefined ? null : (
							<span className="mt-2 block text-danger">{deleteCologErrorMessage}</span>
						)}
					</>
				}
				confirmLabel="영구 삭제"
				cancelLabel="취소"
				variant="danger"
				isPending={deleteCologMutation.isPending}
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</section>
	);
}
