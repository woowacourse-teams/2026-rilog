import Link from 'next/link';

import PageShell from '@/shared/ui/page-shell/PageShell';
import CologSettingsWorkspace from '@/widgets/colog-settings/ui/CologSettingsWorkspace';

interface CologSettingsPageProps {
	params: Promise<{ slug: string }>;
}

export default async function CologSettingsPage({ params }: CologSettingsPageProps) {
	const { slug } = await params;

	return (
		<PageShell
			isViewportConstrained
			header={
				<div className="px-6 pt-8 sm:px-8 md:px-0">
					<Link
						href={`/co-logs/${slug}`}
						aria-label="코로그로 돌아가기"
						className="inline-flex size-7 items-center justify-center rounded-md text-body-2 font-semibold text-text-primary hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus-ring"
					>
						<span aria-hidden="true">←</span>
					</Link>
				</div>
			}
		>
			<CologSettingsWorkspace />
		</PageShell>
	);
}
