import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import BlogProfileViewTracker from '@/features/analytics/ui/BlogProfileViewTracker';
import BlogProfileHero from '@/features/blog-profile/ui/BlogProfileHero';
import CologMemberAside from '@/features/colog-members/ui/CologMemberAside';
import CologSettingsButton from '@/features/colog-settings-access/ui/CologSettingsButton';
import RilogSettingsButton from '@/features/rilog-settings-access/ui/RilogSettingsButton';
import PageShell from '@/shared/ui/page-shell/PageShell';

import BlogHomeNavigation from './BlogHomeNavigation';
import BlogHomeToolbar from './BlogHomeToolbar';
import BlogPostFeedSection from './BlogPostFeedSection';

interface BlogHomeProps {
	profile: BlogPublicProfile;
}

export default function BlogHome({ profile }: BlogHomeProps) {
	const action =
		profile.type === 'COLOG' ? (
			<CologSettingsButton slug={profile.slug} isOnCover />
		) : (
			<RilogSettingsButton slug={profile.slug} />
		);
	const memberAside =
		profile.type === 'COLOG' ? (
			<div className="py-11">
				<CologMemberAside slug={profile.slug} />
			</div>
		) : undefined;

	return (
		<PageShell
			fullHeaderWidth
			header={<BlogProfileHero profile={profile} action={action} />}
			leftAside={
				<div className="h-full py-11">
					<div className="sticky top-8 mx-auto w-full max-w-40">
						<BlogHomeNavigation blogType={profile.type} />
					</div>
				</div>
			}
			rightAside={memberAside}
		>
			<div className="px-6 py-11 aside-right:px-0">
				<BlogHomeToolbar blogType={profile.type} />
				<BlogPostFeedSection slug={profile.slug} />
			</div>
			<BlogProfileViewTracker blogType={profile.type} />
		</PageShell>
	);
}
