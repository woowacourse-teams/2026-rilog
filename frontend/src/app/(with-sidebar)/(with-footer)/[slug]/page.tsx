import { notFound } from 'next/navigation';

import { hasCologSlugPrefix } from '@/shared/routes/app-routes';
import PageShell from '@/shared/ui/page-shell/PageShell';
import {
	MOCK_COLOG_HOME_MEMBERS,
	MOCK_COLOG_HOME_POSTS,
	MOCK_COLOG_HOME_PROFILE,
} from '@/widgets/colog-home/lib/mock-colog-home';
import CologHomeHero from '@/widgets/colog-home/ui/CologHomeHero';
import CologMemberList from '@/widgets/colog-home/ui/CologMemberList';
import CologPostList from '@/widgets/colog-home/ui/CologPostList';

interface CologHomePageProps {
	params: Promise<{ slug: string }>;
}

export default async function CologHomePage({ params }: CologHomePageProps) {
	const { slug } = await params;
	if (!hasCologSlugPrefix(slug)) {
		notFound();
	}

	// TODO(API 연동): params.slug에서 @를 없앤 값으로 코로그 홈 데이터를 조회한다.
	// 조회 실패하면 not found
	return (
		<PageShell
			fullHeaderWidth
			header={<CologHomeHero profile={MOCK_COLOG_HOME_PROFILE} />}
			rightAside={
				<div className="py-11">
					<CologMemberList members={MOCK_COLOG_HOME_MEMBERS} />
				</div>
			}
		>
			<div className="px-6 py-11 aside-right:px-0">
				<CologPostList slug={slug} posts={MOCK_COLOG_HOME_POSTS} />
			</div>
		</PageShell>
	);
}
