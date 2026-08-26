import Button from '@/shared/ui/button/Button';

interface DraftWriteActionButtonsProps {
	draftCount: number;
	isEditorReady: boolean;
	isSaveReady: boolean;
	onSave: () => void;
	onListShow: () => void;
}

export default function DraftWriteActionButtons({
	draftCount,
	isEditorReady,
	isSaveReady,
	onSave,
	onListShow,
}: DraftWriteActionButtonsProps) {
	return (
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
	);
}
