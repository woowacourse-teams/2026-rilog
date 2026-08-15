import CologIcon from '@/widgets/sidebar/assets/colog.svg';
import FeedIcon from '@/widgets/sidebar/assets/feed.svg';

import { SIDEBAR_GLYPH_CLASS_NAME } from './sidebar-class-names';
import SidebarNavigationLink from './SidebarNavigationLink';

export default function PageNavigation() {
	return (
		<nav aria-label="주요 메뉴" className="pt-2">
			<SidebarNavigationLink
				href="/feeds"
				accessibilityLabel="피드 글 132개"
				icon={<FeedIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />}
				label="Feed"
				badge={132}
				isCurrent
				size="md"
			/>
			<SidebarNavigationLink
				href="/cologs"
				accessibilityLabel="코로그 132개"
				icon={<CologIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />}
				label="Colog"
				badge={132}
				size="md"
			/>
		</nav>
	);
}
