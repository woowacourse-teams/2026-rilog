import Link from 'next/link';

import type { CologSummary } from '@/domains/blog/model/colog';
import CologAvatar from '@/domains/blog/ui/CologAvatar';
import { buildCologHomePath } from '@/shared/routes/app-routes';

interface PostDetailCoLogSummaryProps {
	colog: CologSummary;
}

export default function PostDetailCoLogSummary({ colog }: PostDetailCoLogSummaryProps) {
	return (
		<section aria-label="Colog 정보" className="border-t border-border-default py-3">
			<div className="flex items-center gap-3">
				<Link
					href={buildCologHomePath(colog.slug)}
					className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
				>
					<CologAvatar
						src={colog.profileImageUrl ?? undefined}
						fallback={colog.name.slice(0, 1)}
						label={`${colog.name} 로고`}
						size="lg"
					/>
					<span className="min-w-0 text-left">
						<span className="block text-body-1 font-semibold text-text-primary">{colog.name} &gt;</span>
						{colog.description ? (
							<span className="mt-0.5 block truncate text-caption-2 text-text-secondary">{colog.description}</span>
						) : null}
					</span>
				</Link>

				<dl className="hidden shrink-0 grid-cols-2 gap-5 text-left sm:grid">
					<div>
						<dt className="text-caption-1 text-text-secondary">Members</dt>
						<dd className="text-label-1 font-semibold text-brand-primary">{colog.memberCount ?? 0}</dd>
					</div>
					<div>
						<dt className="text-caption-1 text-text-secondary">Posts</dt>
						<dd className="text-label-1 font-semibold text-brand-primary">{colog.postCount ?? 0}</dd>
					</div>
				</dl>
			</div>
		</section>
	);
}
