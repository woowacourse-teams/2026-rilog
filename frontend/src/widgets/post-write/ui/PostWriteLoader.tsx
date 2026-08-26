'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import DraftPostLoader from './DraftPostLoader';
import EditPostLoader from './EditPostLoader';
import NewPostController from './NewPostController';

const loaderClassName = 'flex min-h-dvh items-center justify-center bg-background px-6 text-center';

type InitialPostWriteEntry =
	| { type: 'new' }
	| { type: 'draft'; draftId: number }
	| { type: 'edit'; postId: number }
	| { type: 'invalid-draft' }
	| { type: 'invalid-post' }
	| { type: 'ambiguous' };

const parseInitialEntry = (rawPostId: string | null, rawDraftId: string | null): InitialPostWriteEntry => {
	if (rawPostId !== null && rawDraftId !== null) {
		return { type: 'ambiguous' };
	}

	if (rawDraftId !== null) {
		const draftId = Number(rawDraftId);
		return rawDraftId.trim().length > 0 && Number.isSafeInteger(draftId) && draftId > 0
			? { type: 'draft', draftId }
			: { type: 'invalid-draft' };
	}

	if (rawPostId !== null) {
		const postId = Number(rawPostId);
		return rawPostId.trim().length > 0 && Number.isSafeInteger(postId) && postId > 0
			? { type: 'edit', postId }
			: { type: 'invalid-post' };
	}

	return { type: 'new' };
};

export default function PostWriteLoader() {
	const searchParams = useSearchParams();
	// 최초 임시저장은 URL만 바꾸므로, 동기화된 searchParams가 현재 Controller를 교체하지 않게 진입값을 고정한다.
	// 기존 임시저장 선택은 별도의 새 작성 세션 전환으로 이 경계를 명시적으로 remount해야 한다.
	const [initialEntry] = useState(() => parseInitialEntry(searchParams.get('postId'), searchParams.get('draftId')));

	if (initialEntry.type === 'ambiguous') {
		return (
			<main className={loaderClassName}>
				<p className="text-body-2 text-danger-text" role="alert">
					게시글 ID와 임시저장 ID를 함께 사용할 수 없습니다.
				</p>
			</main>
		);
	}

	if (initialEntry.type === 'invalid-draft') {
		return (
			<main className={loaderClassName}>
				<p className="text-body-2 text-danger-text" role="alert">
					올바르지 않은 임시저장 ID입니다.
				</p>
			</main>
		);
	}

	if (initialEntry.type === 'draft') {
		return <DraftPostLoader draftId={initialEntry.draftId} />;
	}

	if (initialEntry.type === 'invalid-post') {
		return (
			<main className={loaderClassName}>
				<p className="text-body-2 text-danger-text" role="alert">
					{/* TODO: 추가 피드백 필요(리다이렉트 등) */}
					올바르지 않은 게시글 ID입니다.
				</p>
			</main>
		);
	}

	if (initialEntry.type === 'edit') {
		return <EditPostLoader postId={initialEntry.postId} />;
	}

	return <NewPostController />;
}
