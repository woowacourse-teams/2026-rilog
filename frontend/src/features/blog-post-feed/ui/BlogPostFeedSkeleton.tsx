export default function BlogPostFeedSkeleton() {
	const items = Array.from({ length: 5 }, (_, i) => i);

	return (
		<section aria-label="블로그 게시글 로딩 중" className="min-w-0" role="status">
			<ul className="flex flex-col gap-7">
				{items.map((item) => (
					<li key={item} className="flex animate-pulse gap-4 motion-reduce:animate-none">
						<div className="aspect-3/2 h-24 shrink-0 rounded-lg bg-surface-active sm:h-27" />

						<div className="flex min-w-0 flex-1 flex-col justify-between py-1">
							<div className="flex flex-col gap-2">
								<div className="h-5 w-4/5 rounded bg-surface-active sm:h-6" />
								<div className="h-5 w-3/5 rounded bg-surface-active sm:h-6" />
							</div>
							<div className="flex items-center gap-1.5">
								<div className="size-5 shrink-0 rounded-full bg-surface-active" />
								<div className="h-4 w-24 rounded bg-surface-active" />
							</div>
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
