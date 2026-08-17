import CologAvatar from '@/domains/colog/ui/CologAvatar';
import { APP_ROUTES, buildCologHomePath } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME } from './sidebar-class-names';
import SidebarNavigationLink from './SidebarNavigationLink';

const TEAMS = [
	{ slug: 'toss-tech', monogram: 'T', name: '토스 테크', avatarTone: 'subtle' },
	{ slug: 'woowacourse', monogram: 'W', name: '우아한테크코스', avatarTone: 'strong' },
	{ slug: 'baemin', monogram: 'B', name: '배달의 민족', avatarTone: 'subtle' },
	{ slug: 'andromeda', monogram: 'A', name: '안드로메다', avatarTone: 'strong' },
] as const;

export default function CologNavigation() {
	return (
		<nav aria-label="내 코로그">
			<ul className="mt-2 flex w-full flex-col gap-0.5">
				{TEAMS.map((team) => (
					<li key={team.slug} className="w-full">
						<SidebarNavigationLink
							href={buildCologHomePath(team.slug)}
							icon={<CologAvatar fallback={team.monogram} size="md" tone={team.avatarTone} />}
							label={team.name}
						/>
					</li>
				))}
			</ul>
			<ButtonLink
				href={APP_ROUTES.cologCreate}
				variant="secondary"
				aria-label="코로그 만들기"
				fullWidth
				className={`mt-3 border-dashed text-text-secondary ${EXPANDING_ACTION_CLASS_NAME}`}
			>
				<span aria-hidden="true" className="shrink-0 text-body-2 leading-none">
					+
				</span>
				<span className={EXPANDED_TEXT_CLASS_NAME}>Co-log 만들기</span>
			</ButtonLink>
		</nav>
	);
}
