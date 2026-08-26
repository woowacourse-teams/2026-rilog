import Button from '@/shared/ui/button/Button';

interface WritePublishActionBarProps {
	isEditMode: boolean;
	isEditorReady: boolean;
	isPublishReady: boolean;
	draftCount: number;
	onPublish: () => void;
	onDraftSave: () => void;
	onDraftListShow: () => void;
}

export default function WritePublishActionBar({
	isEditMode,
	isEditorReady,
	isPublishReady,
	draftCount,
	onPublish,
	onDraftSave,
	onDraftListShow,
}: WritePublishActionBarProps) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-30 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm min-[512px]:sticky min-[512px]:inset-x-auto min-[512px]:top-0 min-[512px]:bottom-auto min-[512px]:pb-0">
			<div className="flex h-16 max-w-7xl items-center justify-end gap-4 px-4 sm:px-6">
				{isEditMode ? null : (
					<div>
						<Button
							className="min-w-btn-wide rounded-r-none"
							variant="secondary"
							disabled={!isPublishReady}
							onClick={onDraftSave}
						>
							임시저장
						</Button>
						<Button
							className="aspect-square h-auto rounded-l-none border-l-0"
							variant="secondary"
							aria-label={`임시 저장된 글 ${draftCount}개 보기`}
							disabled={!isEditorReady}
							onClick={onDraftListShow}
						>
							{draftCount}
						</Button>
					</div>
				)}
				<Button className="min-w-btn-wide" disabled={!isPublishReady} onClick={onPublish}>
					발행
				</Button>
			</div>
		</div>
	);
}
