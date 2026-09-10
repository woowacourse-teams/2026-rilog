'use client';

import { usePathname } from 'next/navigation';

import CologAvatar from '@/domains/blog/ui/CologAvatar';
import { recordCologCreationEntryContext } from '@/features/analytics/lib/colog-creation-entry-context';
import { useMyCologsOverviewQuery } from '@/shared/api/users/queries/my-cologs-overview/use-query';
import { APP_ROUTES, buildBlogHomePath } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

import { mapMyCologsOverviewResponse } from '../lib/map-my-cologs-overview-response';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME } from './sidebar-class-names';
import SidebarNavigationLink from './SidebarNavigationLink';

const isCurrentCologPath = (pathname: string, slug: string) => {
	const cologHomePath = buildBlogHomePath(slug);

	return pathname === cologHomePath || pathname.startsWith(`${cologHomePath}/`);
};

export default function CologNavigation() {
	const pathname = usePathname();
	const myCologsQuery = useMyCologsOverviewQuery({ select: mapMyCologsOverviewResponse });
	const isInitialPending = myCologsQuery.data === undefined && myCologsQuery.isPending;
	const hasInitialError = myCologsQuery.data === undefined && !isInitialPending;
	const cologStatus = isInitialPending
		? { fallback: '…', message: '내 팀을 불러오는 중...', role: 'status' as const }
		: hasInitialError
			? { fallback: '!', message: '내 팀을 불러오지 못했어요.', role: 'alert' as const }
			: myCologsQuery.data?.length === 0
				? { fallback: '–', message: '아직 소속된 Colog가 없어요.', role: 'status' as const }
				: null;

	return (
		<nav aria-label="내 팀">
			<ul className="mt-2 flex w-full flex-col gap-1">
				{cologStatus ? (
					<li
						className="mx-1.25 flex h-8.75 w-[calc(100%-10px)] items-center gap-2 overflow-hidden text-label-2 text-text-secondary"
						role={cologStatus.role}
					>
						<span className="flex size-8.75 shrink-0 items-center justify-center">
							<CologAvatar className="size-6" fallback={cologStatus.fallback} size="sm" tone="subtle" />
						</span>
						<span className={`truncate ${EXPANDED_TEXT_CLASS_NAME}`}>{cologStatus.message}</span>
					</li>
				) : (
					myCologsQuery.data?.map((colog) => (
						<li key={colog.id} className="w-full">
							<SidebarNavigationLink
								href={buildBlogHomePath(colog.slug)}
								icon={
									<CologAvatar
										className="size-6"
										fallback={colog.name.charAt(0)}
										src={colog.logoUrl ?? undefined}
										size="sm"
										// TODO: 추후 톤이나 색상 정책 적용
										tone="strong"
									/>
								}
								label={colog.name}
								isCurrent={isCurrentCologPath(pathname, colog.slug)}
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
				className={`mx-1.25 mt-3 flex! h-8.75! w-[calc(100%-10px)]! border-dashed border-transparent! text-text-secondary group-hover:border-border-default! ${EXPANDING_ACTION_CLASS_NAME}`}
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
