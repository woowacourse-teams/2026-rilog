import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import BlogProfileHero from '@/features/blog-profile/ui/BlogProfileHero';
import CologMemberAside from '@/features/colog-members/ui/CologMemberAside';
import CologSettingsButton from '@/features/colog-settings-access/ui/CologSettingsButton';
import PageShell from '@/shared/ui/page-shell/PageShell';

import BlogPostFeedSection from './BlogPostFeedSection';

interface BlogHomeProps {
	profile: BlogPublicProfile;
}

export default function BlogHome({ profile }: BlogHomeProps) {
	const action = profile.type === 'COLOG' ? <CologSettingsButton slug={profile.slug} isOnCover /> : undefined;
	const memberAside =
		profile.type === 'COLOG' ? (
			<div className="py-11">
				<CologMemberAside slug={profile.slug} />
			</div>
		) : undefined;

	return (
		<PageShell fullHeaderWidth header={<BlogProfileHero profile={profile} action={action} />} rightAside={memberAside}>
			<div className="px-6 py-11 aside-right:px-0">
				<BlogPostFeedSection slug={profile.slug} />
			</div>
		</PageShell>
	);
}
