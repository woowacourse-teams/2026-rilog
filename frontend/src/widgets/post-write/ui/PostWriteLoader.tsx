'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import DraftPostLoader from './DraftPostLoader';
import EditPostLoader from './EditPostLoader';
import NewPostController from './NewPostController';

const loaderClassName = 'flex min-h-dvh items-center justify-center bg-background px-6 text-center';

type PostWriteEntry =
	| { type: 'new' }
	| { type: 'draft'; draftId: number }
	| { type: 'edit'; postId: number }
	| { type: 'invalid-draft' }
	| { type: 'invalid-post' }
	| { type: 'ambiguous' };

interface PostWriteSession {
	entry: PostWriteEntry;
	key: number;
	promotedDraftId: number | null;
	urlEntryKey: string;
}

const parsePostWriteEntry = (rawPostId: string | null, rawDraftId: string | null): PostWriteEntry => {
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

const createUrlEntryKey = (rawPostId: string | null, rawDraftId: string | null) =>
	JSON.stringify([rawPostId, rawDraftId]);

export default function PostWriteLoader() {
	const searchParams = useSearchParams();
	const rawPostId = searchParams.get('postId');
	const rawDraftId = searchParams.get('draftId');
	const urlEntry = parsePostWriteEntry(rawPostId, rawDraftId);
	const urlEntryKey = createUrlEntryKey(rawPostId, rawDraftId);
	const [session, setSession] = useState<PostWriteSession>(() => ({
		entry: urlEntry,
		key: 0,
		promotedDraftId: null,
		urlEntryKey,
	}));

	let activeSession = session;
	if (session.urlEntryKey !== urlEntryKey) {
		const isCurrentNewPostPromotion =
			session.entry.type === 'new' && urlEntry.type === 'draft' && session.promotedDraftId === urlEntry.draftId;

		activeSession = isCurrentNewPostPromotion
			? { ...session, urlEntryKey }
			: { entry: urlEntry, key: session.key + 1, promotedDraftId: null, urlEntryKey };

		setSession(activeSession);
	}

	const handleDraftPromoted = useCallback((draftId: number) => {
		setSession((currentSession) => ({ ...currentSession, promotedDraftId: draftId }));
	}, []);

	const { entry, key } = activeSession;

	if (entry.type === 'ambiguous') {
		return (
			<main key={key} className={loaderClassName}>
				<p className="text-body-2 text-danger-text" role="alert">
					게시글 ID와 임시저장 ID를 함께 사용할 수 없습니다.
				</p>
			</main>
		);
	}

	if (entry.type === 'invalid-draft') {
		return (
			<main key={key} className={loaderClassName}>
				<p className="text-body-2 text-danger-text" role="alert">
					올바르지 않은 임시저장 ID입니다.
				</p>
			</main>
		);
	}

	if (entry.type === 'draft') {
		return <DraftPostLoader key={key} draftId={entry.draftId} />;
	}

	if (entry.type === 'invalid-post') {
		return (
			<main key={key} className={loaderClassName}>
				<p className="text-body-2 text-danger-text" role="alert">
					{/* TODO: 추가 피드백 필요(리다이렉트 등) */}
					올바르지 않은 게시글 ID입니다.
				</p>
			</main>
		);
	}

	if (entry.type === 'edit') {
		return <EditPostLoader key={key} postId={entry.postId} />;
	}

	return <NewPostController key={key} onDraftPromoted={handleDraftPromoted} />;
}
