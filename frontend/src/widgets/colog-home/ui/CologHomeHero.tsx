import { notFound } from 'next/navigation';

import { readBlogPublicProfile } from '@/shared/api/blogs/api';

import { mapCologProfileResponse } from '../lib/map-colog-profile-response';
import CologProfileHero from '@/features/colog-profile/ui/CologProfileHero';

interface CologHomeHeroProps {
	slug: string;
}

export default async function CologHomeHero({ slug }: CologHomeHeroProps) {
	let profileResponse;

	try {
		profileResponse = await readBlogPublicProfile({ slug });
	} catch {
		notFound();
	}

	if (!profileResponse?.data) {
		notFound();
	}

	const profile = mapCologProfileResponse(profileResponse.data);

	return <CologProfileHero profile={profile} />;
}
