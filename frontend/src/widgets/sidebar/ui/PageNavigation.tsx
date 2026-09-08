'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { usePostsCountQuery } from '@/shared/api/posts/queries/posts-count/use-query';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import CologIcon from '@/widgets/sidebar/assets/colog.svg';
import FeedIcon from '@/widgets/sidebar/assets/feed.svg';
import PersonalIcon from '@/widgets/sidebar/assets/personal.svg';

import { SIDEBAR_GLYPH_CLASS_NAME } from './sidebar-class-names';
import SidebarNavigationLink from './SidebarNavigationLink';

type FeedSelection = 'all' | 'personal' | 'colog';

const SUB_MENUS = [
	{
		selection: 'personal',
		label: '개인',
		icon: <PersonalIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />,
	},
	{
		selection: 'colog',
		label: 'Colog',
		icon: <CologIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />,
	},
] as const;

export default function PageNavigation() {
	const pathname = usePathname();
	const [selection, setSelection] = useState<FeedSelection>('all');
	const { data: postsCountResponse } = usePostsCountQuery();
	const totalPostsCount = postsCountResponse?.data?.totalPostsCount ?? 0;
	const isFeedPage = pathname === APP_ROUTES.feeds;

	return (
		<nav aria-label="주요 메뉴" className="pt-2">
			<SidebarNavigationLink
				href={APP_ROUTES.feeds}
				onNavigate={() => setSelection('all')}
				accessibilityLabel={`피드 글 ${totalPostsCount}개`}
				icon={<FeedIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />}
				label="Feed"
				badge={totalPostsCount}
				isCurrent={isFeedPage && selection === 'all'}
				size="md"
			/>
			<ul className="relative mt-1 flex flex-col gap-1 before:absolute before:inset-y-0 before:left-1 before:w-px before:bg-border-default before:opacity-0 before:transition-opacity before:duration-150 group-hover:before:opacity-100">
				{SUB_MENUS.map(({ selection: value, label, icon }) => (
					<li key={value}>
						<SidebarNavigationLink
							href={APP_ROUTES.feeds}
							onNavigate={() => setSelection(value)}
							icon={icon}
							label={label}
							isCurrent={isFeedPage && selection === value}
							size="md"
						/>
					</li>
				))}
			</ul>
		</nav>
	);
}
