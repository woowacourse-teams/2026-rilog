import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import CologMemberAside from '@/features/colog-members/ui/CologMemberAside';
import PageShell from '@/shared/ui/page-shell/PageShell';

import BlogHomeHero from './BlogHomeHero';
import BlogPostFeedSection from './BlogPostFeedSection';

interface BlogHomeProps {
	profile: BlogPublicProfile;
}

export default function BlogHome({ profile }: BlogHomeProps) {
	const memberAside =
		profile.type === 'COLOG' ? (
			<div className="py-11">
				<CologMemberAside slug={profile.slug} />
			</div>
		) : undefined;

	return (
		<PageShell fullHeaderWidth header={<BlogHomeHero profile={profile} />} rightAside={memberAside}>
			<div className="px-6 py-11 aside-right:px-0">
				<BlogPostFeedSection slug={profile.slug} />
			</div>
		</PageShell>
	);
}
