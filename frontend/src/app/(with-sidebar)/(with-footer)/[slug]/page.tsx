import { notFound } from 'next/navigation';

import { mapBlogPublicProfileResponse } from '@/features/blog-profile/lib/map-blog-public-profile-response';
import { readBlogPublicProfile } from '@/shared/api/blogs/api';
import { hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import BlogHome from '@/widgets/blog-home/ui/BlogHome';

interface BlogHomePageProps {
	params: Promise<{ slug: string }>;
}

export default async function BlogHomePage({ params }: BlogHomePageProps) {
	const { slug } = await params;
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	const normalizedSlug = stripAtPrefix(slug);
	let profileResponse;

	try {
		profileResponse = await readBlogPublicProfile({ slug: normalizedSlug });
	} catch {
		notFound();
	}

	if (profileResponse.data === undefined) {
		notFound();
	}

	if (profileResponse.data.type !== 'COLOG' && profileResponse.data.type !== 'RILOG') {
		notFound();
	}

	return <BlogHome profile={mapBlogPublicProfileResponse(profileResponse.data)} />;
}
