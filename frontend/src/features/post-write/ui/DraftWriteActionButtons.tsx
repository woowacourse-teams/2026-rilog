import Button from '@/shared/ui/button/Button';

interface DraftWriteActionButtonsProps {
	draftCount: number;
	isEditorReady: boolean;
	isSaveReady: boolean;
	isSaving: boolean;
	onSave: () => void;
	onListShow: () => void;
}

export default function DraftWriteActionButtons({
	draftCount,
	isEditorReady,
	isSaveReady,
	isSaving,
	onSave,
	onListShow,
}: DraftWriteActionButtonsProps) {
	return (
		<div className="flex items-center gap-3">
			{isSaving && (
				<span className="text-sm whitespace-nowrap text-text-secondary" role="status" aria-live="polite">
					저장 중...
				</span>
			)}
			<div>
				<Button className="min-w-btn-wide rounded-r-none" variant="secondary" disabled={!isSaveReady} onClick={onSave}>
					임시저장
				</Button>
				<Button
					className="aspect-square h-auto rounded-l-none border-l-0"
					variant="secondary"
					aria-label={`임시 저장된 글 ${draftCount}개 보기`}
					disabled={!isEditorReady}
					onClick={onListShow}
				>
					{draftCount}
				</Button>
			</div>
		</div>
	);
}
