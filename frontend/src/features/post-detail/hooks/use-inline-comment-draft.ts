'use client';

import { useState, useSyncExternalStore } from 'react';

interface InlineCommentDraft {
	anchorId: number | string;
	text: string;
}

// 초안은 현재 스레드에서만 수정하며 다른 탭의 변경은 구독하지 않는다.
const subscribe = () => () => {};
const getServerSnapshot = () => '';

export const useInlineCommentDraft = (anchorId: number | string) => {
	const storageKey = `rilog:inline-comment-draft:${anchorId}`;
	const [editedDraft, setEditedDraft] = useState<InlineCommentDraft | null>(null);
	const savedText = useSyncExternalStore(
		subscribe,
		() => {
			try {
				return sessionStorage.getItem(storageKey) ?? '';
			} catch {
				return '';
			}
		},
		getServerSnapshot,
	);

	const onCommentChange = (text: string) => {
		setEditedDraft({ anchorId, text });
		try {
			if (text === '') {
				sessionStorage.removeItem(storageKey);
			} else {
				sessionStorage.setItem(storageKey, text);
			}
		} catch {
			// 저장소가 차단되거나 가득 차도 현재 입력은 유지한다.
		}
	};

	return {
		commentText: editedDraft?.anchorId === anchorId ? editedDraft.text : savedText,
		onCommentChange,
	};
};
