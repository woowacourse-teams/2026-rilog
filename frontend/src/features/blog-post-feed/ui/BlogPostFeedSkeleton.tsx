import type { BlogPublicProfile } from '@/domains/blog/model/blog';

interface BlogPostFeedSkeletonProps {
	blogType: BlogPublicProfile['type'];
}

export default function BlogPostFeedSkeleton({ blogType }: BlogPostFeedSkeletonProps) {
	const items = Array.from({ length: 5 }, (_, i) => i);

	return (
		<section aria-label="블로그 게시글 로딩 중" className="min-w-0" role="status">
			<ul className="flex flex-col gap-7">
				{items.map((item) => (
					<li key={item} className="flex animate-pulse gap-4 motion-reduce:animate-none">
						<div className="aspect-3/2 h-24 shrink-0 rounded-lg bg-surface-active sm:h-32" />

						<div className="flex min-h-28 min-w-0 flex-1 flex-col justify-between gap-2 py-1">
							<div>
								<div className="h-7 w-4/5 rounded bg-surface-active" />
								<div className="mt-1 flex items-center gap-1.5">
									{blogType === 'COLOG' ? <div className="size-5 shrink-0 rounded-full bg-surface-active" /> : null}
									<div className="h-4 w-1/3 rounded bg-surface-active" />
									<div className="h-4 w-1/3 rounded bg-surface-active" />
								</div>
							</div>
							<div className="h-4 w-3/5 rounded bg-surface-active" />
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
