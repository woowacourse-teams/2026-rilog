'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Block } from '@blocknote/core';

import { isMeaningfulPostBody, validatePostDocument } from '@/features/post-write/lib/validate-post-document';
import type { PostEditorHandle } from '@/features/post-write/model/post-editor';
import type { EditorDocument } from '@/features/post-write/model/post-publication';
import type { PostDocumentErrors } from '@/features/post-write/model/post-write-validation';

interface UsePostDocumentOptions {
	initialDocument?: EditorDocument;
}

export function usePostDocument({ initialDocument }: UsePostDocumentOptions = {}) {
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const editorRef = useRef<PostEditorHandle>(null);
	const latestBlocksRef = useRef<Block[]>(initialDocument?.blocks ?? []);

	const [title, setTitle] = useState(initialDocument?.title ?? '');
	const [isEditorReady, setIsEditorReady] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	const [documentErrors, setDocumentErrors] = useState<PostDocumentErrors>({});

	useEffect(() => {
		titleRef.current?.focus();
	}, []);

	const handleEditorReady = useCallback((blocks: Block[]) => {
		latestBlocksRef.current = blocks;
		setIsEditorReady(true);
	}, []);

	const handleTitleChange = useCallback((nextTitle: string) => {
		setTitle(nextTitle);
		setIsDirty(true);
		setDocumentErrors((currentErrors) => ({ ...currentErrors, title: undefined }));
	}, []);

	const handleEditorChange = useCallback((blocks: Block[]) => {
		latestBlocksRef.current = blocks;
		setIsDirty(true);
		setDocumentErrors((currentErrors) => ({ ...currentErrors, body: undefined }));
	}, []);

	const preparePostDocument = useCallback((): EditorDocument | null => {
		const nextErrors = validatePostDocument(title, latestBlocksRef.current);
		setDocumentErrors(nextErrors);

		if (nextErrors.title !== undefined) {
			titleRef.current?.focus();
			return null;
		}

		if (nextErrors.body !== undefined) {
			editorRef.current?.focus();
			return null;
		}

		return { title: title.trim(), blocks: [...latestBlocksRef.current] };
	}, [title]);

	const markClean = useCallback(() => {
		setIsDirty(false);
	}, []);

	const getDocumentState = useCallback(
		() => ({
			hasTitle: title.trim().length > 0,
			hasBody: isMeaningfulPostBody(latestBlocksRef.current),
		}),
		[title],
	);

	return {
		titleRef,
		editorRef,
		title,
		isEditorReady,
		isDirty,
		documentErrors,
		handleTitleChange,
		handleEditorReady,
		handleEditorChange,
		preparePostDocument,
		markClean,
		getDocumentState,
	};
}
