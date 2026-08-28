'use client';

import { usePostsCountQuery } from '@/shared/api/posts/queries/posts-count/use-query';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import FeedIcon from '@/widgets/sidebar/assets/feed.svg';

import { SIDEBAR_GLYPH_CLASS_NAME } from './sidebar-class-names';
import SidebarNavigationLink from './SidebarNavigationLink';

export default function PageNavigation() {
	const { data: postsCountResponse } = usePostsCountQuery();
	const totalPostsCount = postsCountResponse?.data?.totalPostsCount ?? 0;

	return (
		<nav aria-label="주요 메뉴" className="pt-2">
			<SidebarNavigationLink
				href={APP_ROUTES.feeds}
				accessibilityLabel={`피드 글 ${totalPostsCount}개`}
				icon={<FeedIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />}
				label="Feed"
				badge={totalPostsCount}
				isCurrent
				size="md"
			/>
		</nav>
	);
}
