'use client';

import { useCallback, useRef, useState } from 'react';

import type {
	EditorDocument,
	PublicationSettings,
	PublishPost,
	PublishPostResult,
} from '@/features/post-write/model/post-publication';

type PublishState = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

interface UsePostPublicationOptions {
	publishPost: PublishPost;
	onPublished: (
		result: PublishPostResult,
		settings: PublicationSettings,
		document: EditorDocument,
	) => void | Promise<void>;
	onFailed?: (error: unknown) => void;
}

const getPublishErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : '발행하지 못했습니다. 입력한 내용은 유지되며 다시 시도할 수 있습니다.';

export function usePostPublication({ publishPost, onPublished, onFailed }: UsePostPublicationOptions) {
	const isPublishingRef = useRef(false);
	const [document, setDocument] = useState<EditorDocument | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });

	const open = useCallback((nextDocument: EditorDocument) => {
		setDocument(nextDocument);
		setPublishState({ status: 'idle' });
		setIsModalOpen(true);
	}, []);

	const close = useCallback(() => {
		setIsModalOpen(false);
		setPublishState({ status: 'idle' });
	}, []);

	const publish = useCallback(
		async (settings: PublicationSettings) => {
			if (isPublishingRef.current || document === null) {
				return;
			}

			isPublishingRef.current = true;
			setPublishState({ status: 'pending' });

			try {
				const result = await publishPost({ document, settings });
				await onPublished(result, settings, document);

				isPublishingRef.current = false;
				setPublishState({ status: 'idle' });
				setIsModalOpen(false);
			} catch (error) {
				onFailed?.(error);
				isPublishingRef.current = false;
				setPublishState({ status: 'error', message: getPublishErrorMessage(error) });
			}
		},
		[document, onFailed, onPublished, publishPost],
	);

	return {
		document,
		isModalOpen,
		isPublishing: publishState.status === 'pending',
		publishError: publishState.status === 'error' ? publishState.message : undefined,
		open,
		close,
		publish,
	};
}
