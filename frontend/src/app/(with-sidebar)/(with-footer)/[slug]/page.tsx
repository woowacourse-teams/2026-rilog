import { notFound } from 'next/navigation';

import { readBlogPublicProfile } from '@/shared/api/blogs/api';
import { hasCologSlugPrefix } from '@/shared/routes/app-routes';
import PageShell from '@/shared/ui/page-shell/PageShell';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import { mapCologProfileResponse } from '@/widgets/colog-home/lib/map-colog-profile-response';
import { MOCK_COLOG_HOME_MEMBERS, MOCK_COLOG_HOME_POSTS } from '@/widgets/colog-home/lib/mock-colog-home';
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

	const normalizedSlug = stripAtPrefix(slug);

	let profileData;
	try {
		const response = await readBlogPublicProfile({ slug: normalizedSlug });
		profileData = response.data;
	} catch {
		notFound();
	}

	if (!profileData) {
		notFound();
	}

	const profile = mapCologProfileResponse(profileData);

	return (
		<PageShell
			fullHeaderWidth
			header={<CologHomeHero profile={profile} />}
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
