import Button from '@/shared/ui/button/Button';

interface WritePublishActionBarProps {
	isEditorReady: boolean;
	onPublish: () => void;
}

export default function WritePublishActionBar({ isEditorReady, onPublish }: WritePublishActionBarProps) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-30 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm min-[512px]:sticky min-[512px]:inset-x-auto min-[512px]:top-0 min-[512px]:bottom-auto min-[512px]:pb-0">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-end px-4 sm:px-6">
				<Button className="min-w-btn-wide" disabled={!isEditorReady} onClick={onPublish}>
					발행
				</Button>
			</div>
		</div>
	);
}
