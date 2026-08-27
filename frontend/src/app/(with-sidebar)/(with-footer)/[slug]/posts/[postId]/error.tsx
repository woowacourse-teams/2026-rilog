'use client';

import ContentLoadFailureTracker from '@/features/analytics/ui/ContentLoadFailureTracker';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ButtonLink from '@/shared/ui/button/ButtonLink';

interface PostDetailErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function PostDetailError({ error, reset }: PostDetailErrorProps) {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
			<ContentLoadFailureTracker surface="post_detail" loadPhase="detail" error={error} />
			<div>
				<h1 className="text-heading-3 font-bold text-text-primary">게시글을 불러오지 못했어요.</h1>
				<p className="mt-3 text-body-2 text-text-secondary">잠시 후 다시 시도해 주세요.</p>
			</div>
			<div className="flex gap-3">
				<Button variant="secondary" onClick={reset}>
					다시 시도
				</Button>
				<ButtonLink href={APP_ROUTES.feeds}>피드로 돌아가기</ButtonLink>
			</div>
		</main>
	);
}
