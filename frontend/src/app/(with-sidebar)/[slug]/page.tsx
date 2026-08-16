import PageShell from '@/shared/ui/page-shell/PageShell';
import { MOCK_COLOG_HOME } from '@/widgets/colog-home/lib/mock-colog-home';
import CologHomeHero from '@/widgets/colog-home/ui/CologHomeHero';
import CologMemberList from '@/widgets/colog-home/ui/CologMemberList';
import CologPostList from '@/widgets/colog-home/ui/CologPostList';

export default function CologHomePage() {
	// TODO(API 연동): params.slug로 코로그 홈 데이터를 조회해 전달한다.
	const { profile, posts, members } = MOCK_COLOG_HOME;

	return (
		<PageShell
			fullHeaderWidth
			header={<CologHomeHero profile={profile} />}
			rightAside={
				<div className="py-11">
					<CologMemberList members={members} />
				</div>
			}
		>
			<div className="px-6 py-11 aside-right:px-0">
				<CologPostList posts={posts} />
			</div>
		</PageShell>
	);
}
