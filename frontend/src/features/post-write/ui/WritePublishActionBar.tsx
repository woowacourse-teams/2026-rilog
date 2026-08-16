import Button from '@/shared/ui/button/Button';

interface WritePublishActionBarProps {
	isEditorReady: boolean;
	onPublish: () => void;
}

export default function WritePublishActionBar({ isEditorReady, onPublish }: WritePublishActionBarProps) {
	return (
		<div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-end px-4 sm:px-6">
				<Button className="min-w-btn-wide" disabled={!isEditorReady} onClick={onPublish}>
					발행
				</Button>
			</div>
		</div>
	);
}
