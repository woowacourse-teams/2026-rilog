'use client';

import ContentLoadFailureTracker from '@/features/analytics/ui/ContentLoadFailureTracker';
import { useDraftInitialDocument } from '@/features/post-write/hooks/use-draft-initial-document';
import Button from '@/shared/ui/button/Button';

import DraftPostController from './DraftPostController';

const loaderClassName = 'flex min-h-dvh items-center justify-center bg-background px-6 text-center';

interface DraftPostLoaderProps {
	draftId: number;
}

export default function DraftPostLoader({ draftId }: DraftPostLoaderProps) {
	const initialDocumentQuery = useDraftInitialDocument({ draftId, isEnabled: true });

	if (initialDocumentQuery.isPending) {
		return (
			<main className={loaderClassName}>
				<p className="text-body-2 text-text-secondary" role="status">
					임시저장 글을 불러오고 있어요.
				</p>
			</main>
		);
	}

	if (initialDocumentQuery.isError || initialDocumentQuery.data === undefined) {
		return (
			<main className={loaderClassName}>
				<ContentLoadFailureTracker
					surface="post_editor"
					loadPhase="draft_initial_data"
					error={initialDocumentQuery.error}
				/>
				<div className="flex flex-col items-center gap-5" role="alert">
					<p className="text-body-2 text-danger-text">임시저장 글을 불러오지 못했습니다.</p>
					<Button variant="secondary" onClick={() => void initialDocumentQuery.refetch()}>
						다시 시도
					</Button>
				</div>
			</main>
		);
	}

	return <DraftPostController key={draftId} draftId={draftId} initialDocument={initialDocumentQuery.data} />;
}
