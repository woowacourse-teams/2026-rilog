import type { ReactNode } from 'react';

import Button from '@/shared/ui/button/Button';

interface WritePublishActionBarProps {
	isPublishReady: boolean;
	secondaryActions?: ReactNode;
	publishLabel?: string;
	onPublish: () => void;
}

export default function WritePublishActionBar({
	isPublishReady,
	secondaryActions,
	publishLabel = '발행',
	onPublish,
}: WritePublishActionBarProps) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-30 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm min-[512px]:sticky min-[512px]:inset-x-auto min-[512px]:top-0 min-[512px]:bottom-auto min-[512px]:pb-0">
			<div className="relative mx-auto h-16 w-full max-w-2xl">
				<div className="flex h-16 items-center justify-end gap-4 px-4 min-[512px]:px-0 min-[100rem]:absolute min-[100rem]:left-[calc(100%+4rem)] min-[100rem]:w-max">
					{secondaryActions}
					<Button className="min-w-btn-wide" disabled={!isPublishReady} onClick={onPublish}>
						{publishLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
