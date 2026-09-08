const SKELETON_ITEMS = Array.from({ length: 12 }, (_, index) => index);

export default function PostFeedSkeleton() {
	return (
		<div className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-16" role="status" aria-label="피드를 불러오는 중">
			<div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{SKELETON_ITEMS.map((item) => (
					<div key={item} className="animate-pulse motion-reduce:animate-none">
						<div className="aspect-video rounded-xl bg-surface-active" />
						<div className="mt-2 flex h-5.5 items-center gap-1.5">
							<div className="size-5 rounded-full bg-surface-active" />
							<div className="h-4 w-2/5 rounded bg-surface-active" />
						</div>
						<div className="mt-1 h-14 rounded bg-surface-active" />
						<div className="mt-3 h-4 w-2/5 rounded bg-surface-active" />
					</div>
				))}
			</div>
		</div>
	);
}
