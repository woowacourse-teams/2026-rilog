'use client';

import CologAvatar from '@/domains/blog/ui/CologAvatar';
import { recordCologCreationEntryContext } from '@/features/analytics/lib/colog-creation-entry-context';
import { useMyCologsPreviewQuery } from '@/shared/api/users/queries/my-cologs-preview/use-query';
import { APP_ROUTES, buildBlogHomePath } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

import { mapMyCologsPreviewResponse } from '../lib/map-my-cologs-preview-response';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME } from './sidebar-class-names';
import SidebarNavigationLink from './SidebarNavigationLink';

export default function CologNavigation() {
	const { data: myCologs, isPending } = useMyCologsPreviewQuery({ select: mapMyCologsPreviewResponse });

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
				fullWidth
				className={`mt-3 border-dashed text-text-secondary ${EXPANDING_ACTION_CLASS_NAME}`}
			>
				<span aria-hidden="true" className="shrink-0 text-body-2 leading-none">
					+
				</span>
				<span className={EXPANDED_TEXT_CLASS_NAME}>팀 만들기</span>
			</ButtonLink>
		</nav>
	);
}
