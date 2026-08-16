import type { Metadata } from 'next';

import CologCreateForm from '@/features/colog-create/ui/CologCreateForm';
import PageShell from '@/shared/ui/page-shell/PageShell';

export const metadata: Metadata = {
	title: '팀 생성 | Rilog',
};

export default function CologCreatePage() {
	return (
		<PageShell>
			<section className="px-6 pt-20 md:px-0">
				<h1 className="text-heading-3 font-semibold">팀 생성</h1>
				<p className="mt-2 text-body-2 text-text-secondary">함께 기록할 팀의 기본 정보와 소개를 입력해 주세요.</p>
				<CologCreateForm />
			</section>
		</PageShell>
	);
}
