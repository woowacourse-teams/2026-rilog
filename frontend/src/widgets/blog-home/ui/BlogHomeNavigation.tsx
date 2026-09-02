'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import type { BlogType } from '@/domains/blog/model/blog';
import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';
import { ALL_BLOG_POSTS_FILTER, buildBlogHomeFilterHref } from '@/features/blog-home-index/lib/blog-home-filter';
import type { BlogHomeIndexItem } from '@/features/blog-home-index/model/blog-home-index';
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';

interface BlogHomeNavigationProps {
	blogType: BlogType;
	slug: string;
	filter: PublicBlogPostsFilter;
	initialIndexRequestFailed?: boolean;
	onNavigate?: () => void;
}

const ROW_CLASS_NAME =
	'flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-sm px-2 text-left text-body-1 font-normal text-navy-600 transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus-ring active:bg-surface-active motion-reduce:transition-none sm:min-h-7';

function NavigationRow({
	item,
	filter,
	blogType,
	isCurrent,
	onNavigate,
}: {
	item: BlogHomeIndexItem;
	filter: PublicBlogPostsFilter;
	blogType: BlogType;
	isCurrent: boolean;
	onNavigate?: () => void;
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	return (
		<CustomLink
			href={buildBlogHomeFilterHref(pathname, searchParams, filter, blogType)}
			scroll={false}
			aria-label={`${item.name}, 글 ${item.postCount}개`}
			aria-current={isCurrent ? 'page' : undefined}
			className={isCurrent ? `${ROW_CLASS_NAME} font-semibold text-text-primary` : ROW_CLASS_NAME}
			onClick={onNavigate}
		>
			<span className="min-w-0 truncate">{item.name}</span>
			<span className="shrink-0 text-label-1 text-text-disabled">{item.postCount}</span>
		</CustomLink>
	);
}

function AllPostsRow({
	totalCount,
	blogType,
	isCurrent,
	onNavigate,
}: {
	totalCount: number;
	blogType: BlogType;
	isCurrent: boolean;
	onNavigate?: () => void;
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	return (
		<CustomLink
			href={buildBlogHomeFilterHref(pathname, searchParams, ALL_BLOG_POSTS_FILTER, blogType)}
			scroll={false}
			aria-label={`전체보기, 글 ${totalCount}개`}
			aria-current={isCurrent ? 'page' : undefined}
			className={`${ROW_CLASS_NAME} w-full ${isCurrent ? 'font-semibold text-text-primary' : ''}`}
			onClick={onNavigate}
		>
			<span className="min-w-0 truncate">전체보기</span>
			<span className="shrink-0 text-label-1 text-text-disabled">{totalCount}</span>
		</CustomLink>
	);
}

function EmptyIndexMessage({ children }: { children: string }) {
	return <p className="px-2 py-2 text-label-1 text-text-disabled">{children}</p>;
}

export default function BlogHomeNavigation({
	blogType,
	slug,
	filter,
	initialIndexRequestFailed = false,
	onNavigate,
}: BlogHomeNavigationProps) {
	const { index, hasError, isPending, retry } = useBlogHomeIndex({
		slug,
		initialRequestFailed: initialIndexRequestFailed,
	});

	if (hasError) {
		return (
			<section aria-label="블로그 인덱스 오류" className="flex flex-col items-start gap-3" role="alert">
				<p className="text-body-2 text-text-secondary">인덱스를 불러오지 못했어요.</p>
				<Button variant="secondary" size="sm" onClick={retry}>
					다시 시도
				</Button>
			</section>
		);
	}

	if (isPending || index === undefined) {
		return (
			<p className="text-body-2 text-text-secondary" aria-live="polite">
				인덱스를 불러오는 중...
			</p>
		);
	}

	const allPostsRow = (
		<AllPostsRow
			totalCount={index.totalCount}
			blogType={blogType}
			isCurrent={filter.type === 'all'}
			onNavigate={onNavigate}
		/>
	);

	if (blogType === 'COLOG') {
		return (
			<nav aria-label="챕터 탐색" className="w-full">
				<section aria-labelledby="chapter-navigation-title">
					<h2 id="chapter-navigation-title" className="mb-1 text-body-2 font-semibold text-text-primary">
						챕터
					</h2>
					<div className="flex flex-col">
						{allPostsRow}
						{index.chapterIndexes.map((chapter) => (
							<NavigationRow
								key={chapter.id}
								item={chapter}
								filter={{ type: 'chapterId', chapterId: chapter.id }}
								blogType={blogType}
								isCurrent={filter.type === 'chapterId' && filter.chapterId === chapter.id}
								onNavigate={onNavigate}
							/>
						))}
					</div>
				</section>
			</nav>
		);
	}

	return (
		<nav aria-label="시리즈와 Colog 탐색" className="w-full">
			<h2 className="sr-only">시리즈와 Colog</h2>
			{allPostsRow}
			<section aria-labelledby="series-navigation-title" className="mt-6">
				<h3 id="series-navigation-title" className="mb-1 text-body-2 font-semibold text-text-primary">
					시리즈
				</h3>
				<div className="flex flex-col">
					{index.chapterIndexes.map((series) => (
						<NavigationRow
							key={series.id}
							item={series}
							filter={{ type: 'chapterId', chapterId: series.id }}
							blogType={blogType}
							isCurrent={filter.type === 'chapterId' && filter.chapterId === series.id}
							onNavigate={onNavigate}
						/>
					))}
					{index.chapterIndexes.length === 0 ? <EmptyIndexMessage>없음</EmptyIndexMessage> : null}
				</div>
			</section>

			<section aria-labelledby="colog-navigation-title" className="mt-6">
				<h3 id="colog-navigation-title" className="mb-1 text-body-2 font-semibold text-text-primary">
					Colog
				</h3>
				<div className="flex flex-col">
					{index.cologIndexes.map((colog) => (
						<NavigationRow
							key={colog.id}
							item={colog}
							filter={{ type: 'targetCologSlug', targetCologSlug: colog.slug }}
							blogType={blogType}
							isCurrent={filter.type === 'targetCologSlug' && filter.targetCologSlug === colog.slug}
							onNavigate={onNavigate}
						/>
					))}
					{index.cologIndexes.length === 0 ? (
						<EmptyIndexMessage>아직 Colog에 작성한 글이 없습니다.</EmptyIndexMessage>
					) : null}
				</div>
			</section>
		</nav>
	);
}
