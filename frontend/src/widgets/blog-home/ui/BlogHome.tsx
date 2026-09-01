import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import BlogProfileViewTracker from '@/features/analytics/ui/BlogProfileViewTracker';
import BlogHomeIndexRecovery from '@/features/blog-home-index/ui/BlogHomeIndexRecovery';
import BlogPostFeed from '@/features/blog-post-feed/ui/BlogPostFeed';
import BlogProfileHero from '@/features/blog-profile/ui/BlogProfileHero';
import CologMemberAside from '@/features/colog-members/ui/CologMemberAside';
import CologSettingsButton from '@/features/colog-settings-access/ui/CologSettingsButton';
import RilogSettingsButton from '@/features/rilog-settings-access/ui/RilogSettingsButton';
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';
import PageShell from '@/shared/ui/page-shell/PageShell';

import BlogHomeCologAside from './BlogHomeCologAside';
import BlogHomeNavigation from './BlogHomeNavigation';
import BlogHomeToolbar from './BlogHomeToolbar';

interface BlogHomeProps {
	profile: BlogPublicProfile;
	filter: PublicBlogPostsFilter;
	postsFilter?: PublicBlogPostsFilter;
	initialIndexRequestFailed?: boolean;
	initialPostsRequestFailed?: boolean;
}

export default function BlogHome({
	profile,
	filter,
	postsFilter = filter,
	initialIndexRequestFailed = false,
	initialPostsRequestFailed = false,
}: BlogHomeProps) {
	const action =
		profile.type === 'COLOG' ? (
			<CologSettingsButton slug={profile.slug} isOnCover />
		) : (
			<RilogSettingsButton slug={profile.slug} />
		);
	const rightAside =
		profile.type === 'COLOG' ? (
			<div className="py-11">
				<CologMemberAside slug={profile.slug} />
			</div>
		) : (
			<div className="py-11">
				<BlogHomeCologAside slug={profile.slug} initialIndexRequestFailed={initialIndexRequestFailed} />
			</div>
		);

	return (
		<PageShell
			fullHeaderWidth
			header={<BlogProfileHero profile={profile} action={action} />}
			leftAside={
				<div className="h-full py-11">
					<div className="sticky top-8 mx-auto w-full max-w-40">
						<BlogHomeNavigation
							blogType={profile.type}
							slug={profile.slug}
							filter={filter}
							initialIndexRequestFailed={initialIndexRequestFailed}
						/>
					</div>
				</div>
			}
			rightAside={rightAside}
		>
			<div className="px-6 py-11 aside-right:px-0">
				<BlogHomeToolbar
					blogType={profile.type}
					slug={profile.slug}
					filter={filter}
					initialIndexRequestFailed={initialIndexRequestFailed}
				/>
				<BlogPostFeed slug={profile.slug} filter={postsFilter} initialRequestFailed={initialPostsRequestFailed} />
			</div>
			{initialIndexRequestFailed ? <BlogHomeIndexRecovery slug={profile.slug} /> : null}
			<BlogProfileViewTracker blogType={profile.type} />
		</PageShell>
	);
}
