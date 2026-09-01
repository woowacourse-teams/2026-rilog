import CologAvatar from '@/domains/blog/ui/CologAvatar';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';
import ProfileAsideList from '@/shared/ui/profile/ProfileAsideList';

import { AFFILIATED_COLOGS } from './blog-home-publications';

export default function BlogHomeCologAside() {
	return (
		<ProfileAsideList
			title="Cologs"
			isEmpty={AFFILIATED_COLOGS.length === 0}
			emptyMessage="아직 참여한 코로그가 없습니다."
		>
			{AFFILIATED_COLOGS.map((colog) => (
				<li key={colog.id}>
					<CustomLink
						href={buildBlogHomePath(colog.slug)}
						aria-label={`${colog.name} 코로그로 이동`}
						className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
					>
						<CologAvatar
							src={colog.logoUrl ?? undefined}
							fallback={colog.name.slice(0, 1)}
							label={`${colog.name} 로고`}
							size="aside"
							tone="subtle"
						/>
					</CustomLink>
				</li>
			))}
		</ProfileAsideList>
	);
}
