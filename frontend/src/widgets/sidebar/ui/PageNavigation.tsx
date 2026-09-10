'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { buildFeedFilterHref, parseFeedFilters } from '@/features/post-feed/lib/feed-filter';
import { usePostsCountQuery } from '@/shared/api/posts/queries/posts-count/use-query';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import CologIcon from '@/widgets/sidebar/assets/colog.svg';
import FeedIcon from '@/widgets/sidebar/assets/feed.svg';
import PersonalIcon from '@/widgets/sidebar/assets/personal.svg';

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
	const { data: postsCountResponse } = usePostsCountQuery();
	const totalPostsCount = postsCountResponse?.data?.totalPostsCount ?? 0;
	const isFeedPage = pathname === APP_ROUTES.feeds;
	const currentFeedSearchParams = isFeedPage ? searchParams : {};
	const filters = parseFeedFilters(searchParams);
	const handleFeedNavigation = (href: string) =>
		isFeedPage
			? (event: { preventDefault: () => void }) => {
					event.preventDefault();
					window.history.pushState(null, '', href);
				}
			: undefined;
	const feedHref = buildFeedFilterHref(currentFeedSearchParams, { blogType: undefined });

	return (
		<nav aria-label="주요 메뉴" className="pt-2">
			<SidebarNavigationLink
				href={feedHref}
				scroll={!isFeedPage}
				onNavigate={handleFeedNavigation(feedHref)}
				accessibilityLabel={`피드 글 ${totalPostsCount}개`}
				icon={<FeedIcon aria-hidden="true" focusable="false" className={FEED_ICON_CLASS_NAME} />}
				label="Feed"
				badge={totalPostsCount}
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
