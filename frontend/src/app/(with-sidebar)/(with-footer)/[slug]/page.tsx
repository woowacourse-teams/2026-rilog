import { notFound } from 'next/navigation';

import { hasCologSlugPrefix } from '@/shared/routes/app-routes';
import PageShell from '@/shared/ui/page-shell/PageShell';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import CologHomeHero from '@/widgets/colog-home/ui/CologHomeHero';
import CologPostList from '@/widgets/colog-home/ui/CologPostList';
import { MOCK_COLOG_HOME_MEMBERS } from '@/features/colog-members/lib/mock-colog-home';
import CologMemberList from '@/features/colog-members/ui/CologMemberList';

interface CologHomePageProps {
	params: Promise<{ slug: string }>;
}

export default async function CologHomePage({ params }: CologHomePageProps) {
	const { slug } = await params;
	if (!hasCologSlugPrefix(slug)) {
		notFound();
	}

	const normalizedSlug = stripAtPrefix(slug);

	return (
		<PageShell
			fullHeaderWidth
			header={<CologHomeHero slug={normalizedSlug} />}
			rightAside={
				<div className="py-11">
					<CologMemberList members={MOCK_COLOG_HOME_MEMBERS} />
				</div>
			}
		>
			<div className="px-6 py-11 aside-right:px-0">
				<CologPostList slug={normalizedSlug} />
			</div>
		</PageShell>
	);
}
