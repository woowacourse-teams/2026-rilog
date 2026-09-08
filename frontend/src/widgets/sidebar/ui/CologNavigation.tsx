'use client';

import CologAvatar from '@/domains/blog/ui/CologAvatar';
import { recordCologCreationEntryContext } from '@/features/analytics/lib/colog-creation-entry-context';
import { useMyCologsOverviewQuery } from '@/shared/api/users/queries/my-cologs-overview/use-query';
import { APP_ROUTES, buildBlogHomePath } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

import { mapMyCologsOverviewResponse } from '../lib/map-my-cologs-overview-response';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME } from './sidebar-class-names';
import SidebarNavigationLink from './SidebarNavigationLink';

export default function CologNavigation() {
	const { data: myCologs, isPending } = useMyCologsOverviewQuery({ select: mapMyCologsOverviewResponse });

	return (
		<nav aria-label="내 팀">
			<ul className="mt-2 flex w-full flex-col gap-0.5">
				{isPending ? (
					<li className="px-2 py-1 text-xs text-text-secondary">로딩 중...</li>
				) : (
					myCologs?.map((colog) => (
						<li key={colog.id} className="w-full">
							<SidebarNavigationLink
								href={buildBlogHomePath(colog.slug)}
								icon={
									<CologAvatar
										fallback={colog.name.charAt(0)}
										src={colog.logoUrl ?? undefined}
										size="md"
										className="size-8.75!"
										// TODO: 추후 톤이나 색상 정책 적용
										tone="strong"
									/>
								}
								label={colog.name}
							/>
						</li>
					))
				)}
			</ul>
			<ButtonLink
				href={APP_ROUTES.cologCreate}
				onClick={() => recordCologCreationEntryContext('sidebar')}
				variant="secondary"
				aria-label="팀 만들기"
				className={`mx-1.25 mt-3 flex! h-8.75! w-[calc(100%-10px)]! border-dashed text-text-secondary ${EXPANDING_ACTION_CLASS_NAME}`}
			>
				<span
					aria-hidden="true"
					className="flex h-full w-8.75 shrink-0 items-center justify-center text-body-2 leading-none"
				>
					+
				</span>
				<span className={`absolute left-1/2 -translate-x-1/2 ${EXPANDED_TEXT_CLASS_NAME}`}>팀 만들기</span>
			</ButtonLink>
		</nav>
	);
}
