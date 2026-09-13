'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { buildFeedFilterHref, parseFeedFilters } from '@/features/post-feed/lib/feed-filter';
import { navigateFeedFilter } from '@/features/post-feed/lib/navigate-feed-filter';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import CologIcon from '@/widgets/sidebar/assets/colog.svg';
import FeedIcon from '@/widgets/sidebar/assets/feed.svg';
import PersonalIcon from '@/widgets/sidebar/assets/personal.svg';

import { useSidebarPostsCount } from '../hooks/use-sidebar-posts-count';

import SidebarNavigationLink from './SidebarNavigationLink';

const FEED_ICON_CLASS_NAME = 'size-6 shrink-0';

const SUB_MENUS = [
	{
		blogType: 'RILOG',
		label: '개인',
		icon: <PersonalIcon aria-hidden="true" focusable="false" className={FEED_ICON_CLASS_NAME} />,
	},
	{
		blogType: 'COLOG',
		label: 'Colog',
		icon: <CologIcon aria-hidden="true" focusable="false" className={FEED_ICON_CLASS_NAME} />,
	},
] as const;

export default function PageNavigation() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const postsCount = useSidebarPostsCount();
	const feedAccessibilityLabel =
		postsCount.status === 'success'
			? `피드 글 ${postsCount.totalPostsCount}개`
			: postsCount.status === 'pending'
				? '피드 글 수 불러오는 중'
				: '피드 글 수를 불러오지 못함';
	const feedBadge =
		postsCount.status === 'success' ? (
			postsCount.totalPostsCount
		) : postsCount.status === 'pending' ? (
			<span
				aria-hidden="true"
				className="block h-3 w-5 animate-pulse rounded bg-surface-active motion-reduce:animate-none"
			/>
		) : undefined;
	const isFeedPage = pathname === APP_ROUTES.feeds;
	const currentFeedSearchParams = isFeedPage ? searchParams : {};
	const filters = parseFeedFilters(searchParams);
	const handleFeedNavigation = (href: string) =>
		isFeedPage
			? (event: { preventDefault: () => void }) => {
					event.preventDefault();
					navigateFeedFilter(href);
				}
			: undefined;
	const feedHref = buildFeedFilterHref(currentFeedSearchParams, { blogType: undefined });

	return (
		<nav aria-label="주요 메뉴" className="pt-2">
			<SidebarNavigationLink
				href={feedHref}
				scroll={!isFeedPage}
				onNavigate={handleFeedNavigation(feedHref)}
				accessibilityLabel={feedAccessibilityLabel}
				icon={<FeedIcon aria-hidden="true" focusable="false" className={FEED_ICON_CLASS_NAME} />}
				label="Feed"
				badge={feedBadge}
				isCurrent={isFeedPage && filters.blogType === undefined}
			/>
			<ul className="relative mt-1 flex flex-col gap-1 before:absolute before:inset-y-0 before:left-1 before:w-px before:bg-border-default before:opacity-0 before:transition-opacity before:duration-150 group-hover:before:opacity-100">
				{SUB_MENUS.map(({ blogType, label, icon }) => {
					const href = buildFeedFilterHref(currentFeedSearchParams, { blogType });

					return (
						<li key={blogType}>
							<SidebarNavigationLink
								href={href}
								scroll={!isFeedPage}
								onNavigate={handleFeedNavigation(href)}
								icon={icon}
								label={label}
								isCurrent={isFeedPage && filters.blogType === blogType}
								className="group-hover:rounded-l-none"
							/>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
