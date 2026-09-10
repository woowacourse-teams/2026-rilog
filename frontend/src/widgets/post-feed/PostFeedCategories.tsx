'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { POST_CATEGORY_OPTIONS } from '@/domains/post/model/post';
import { buildFeedFilterHref, parseFeedFilters } from '@/features/post-feed/lib/feed-filter';

const CATEGORIES = [{ label: '전체', value: undefined }, ...POST_CATEGORY_OPTIONS] as const;

interface PostFeedCategoriesProps {
	id: string;
}

export default function PostFeedCategories({ id }: PostFeedCategoriesProps) {
	const searchParams = useSearchParams();
	const filters = parseFeedFilters(searchParams);

	return (
		<ul
			id={id}
			aria-label="게시글 카테고리"
			className="mx-auto mb-6 flex w-full max-w-7xl scroll-mt-20 gap-4 px-6 text-left text-body-1 sm:scroll-mt-8 md:px-16"
		>
			{CATEGORIES.map(({ label, value }) => {
				const href = buildFeedFilterHref(searchParams, { category: value });
				const isCurrent = filters.category === value;

				return (
					<li key={label}>
						<Link
							href={href}
							scroll={false}
							onNavigate={(event) => {
								event.preventDefault();
								window.history.pushState(null, '', href);
							}}
							aria-current={isCurrent ? 'page' : undefined}
							className={isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary hover:text-focus-ring'}
						>
							{label}
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
