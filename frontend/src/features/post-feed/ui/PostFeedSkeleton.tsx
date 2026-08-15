const SKELETON_ITEMS = Array.from({ length: 12 }, (_, index) => index);

export default function PostFeedSkeleton() {
	return (
		<div className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-16" role="status" aria-label="피드를 불러오는 중">
			<div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{SKELETON_ITEMS.map((item) => (
					<div key={item} className="animate-pulse motion-reduce:animate-none">
						<div className="aspect-video rounded-xl bg-surface-active" />
						<div className="mt-4 h-6 w-4/5 rounded bg-surface-active" />
						<div className="mt-2 h-6 w-3/5 rounded bg-surface-active" />
						<div className="mt-3 h-5 w-2/5 rounded bg-surface-active" />
					</div>
				))}
			</div>
		</div>
	);
}
