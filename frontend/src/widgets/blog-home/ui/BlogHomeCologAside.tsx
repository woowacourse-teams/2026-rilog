'use client';

import CologAvatar from '@/domains/blog/ui/CologAvatar';
import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';
import ProfileAsideList from '@/shared/ui/profile/ProfileAsideList';

interface BlogHomeCologAsideProps {
	slug: string;
	initialIndexRequestFailed?: boolean;
}

export default function BlogHomeCologAside({ slug, initialIndexRequestFailed = false }: BlogHomeCologAsideProps) {
	const { index, hasError, isPending, retry } = useBlogHomeIndex({
		slug,
		initialRequestFailed: initialIndexRequestFailed,
	});

	if (hasError) {
		return (
			<section aria-label="Cologs" className="flex flex-col items-start gap-3" role="alert">
				<h2 className="text-title-2 font-semibold text-text-primary">Cologs</h2>
				<p className="text-label-1 text-text-secondary">코로그 목록을 불러오지 못했어요.</p>
				<Button variant="secondary" size="sm" onClick={retry}>
					다시 시도
				</Button>
			</section>
		);
	}

	if (isPending || index === undefined) {
		return (
			<section aria-label="Cologs" aria-live="polite">
				<h2 className="text-title-2 font-semibold text-text-primary">Cologs</h2>
				<p className="mt-3 text-label-1 text-text-secondary">코로그 목록을 불러오는 중...</p>
			</section>
		);
	}

	return (
		<ProfileAsideList
			title="Cologs"
			isEmpty={index.cologIndexes.length === 0}
			emptyMessage="아직 참여한 코로그가 없습니다."
		>
			{index.cologIndexes.map((colog) => (
				<li key={colog.id}>
					<CustomLink
						href={buildBlogHomePath(colog.slug)}
						aria-label={`${colog.name} 코로그로 이동`}
						className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
					>
						<CologAvatar
							src={colog.profileImageUrl ?? undefined}
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
