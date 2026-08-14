import SidebarNavigationIcon from './SidebarNavigationIcon';
import SidebarNavigationLink from './SidebarNavigationLink';

export default function PageNavigation() {
	return (
		<nav aria-label="주요 메뉴" className="pt-2">
			<SidebarNavigationLink
				href="/feeds"
				accessibilityLabel="피드 글 132개"
				icon={<SidebarNavigationIcon />}
				label="Feed"
				badge={132}
				isCurrent
				size="md"
			/>
			<SidebarNavigationLink
				href="/cologs"
				accessibilityLabel="코로그 132개"
				icon={<SidebarNavigationIcon />}
				label="Colog"
				badge={132}
				size="md"
			/>
		</nav>
	);
}
