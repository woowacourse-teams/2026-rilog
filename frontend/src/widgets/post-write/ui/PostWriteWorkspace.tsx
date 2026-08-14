'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Block } from '@blocknote/core';
import type { ComponentType } from 'react';

import { useUnsavedChangesGuard } from '@/features/post-write/hooks/use-unsaved-changes-guard';
import { COLOG_OPTIONS_MOCK } from '@/features/post-write/lib/mock-colog-options';
import { mockUploadPostBodyFile } from '@/features/post-write/lib/mock-upload-post-body-file';
import type { PostEditorHandle, PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { PublicationSettings } from '@/features/post-write/model/post-publication';
import type { PostDocumentErrors } from '@/features/post-write/model/post-write-validation';
import { validatePostDocument } from '@/features/post-write/model/post-write-validation';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';
import PublishSettingsModal from '@/features/post-write/ui/PublishSettingsModal';
import WritePublishActionBar from '@/features/post-write/ui/WritePublishActionBar';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

const DEFAULT_POST_COVER_PATH = '/images/default-post-cover.svg';

const INITIAL_PUBLICATION_SETTINGS: PublicationSettings = {
	category: 'IT',
	blogId: null,
	representativeImage: null,
};

interface PostWriteWorkspaceProps {
	editorComponent?: ComponentType<PostEditorProps>;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
}

export default function PostWriteWorkspace({
	editorComponent = DynamicBlockNoteEditor,
	uploadFile = mockUploadPostBodyFile,
	navigate,
}: PostWriteWorkspaceProps) {
	const router = useRouter();
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const editorRef = useRef<PostEditorHandle>(null);
	const latestBlocksRef = useRef<Block[]>([]);
	const selectedImageUrlRef = useRef<string | null>(null);

	const [title, setTitle] = useState('');
	const [isEditorReady, setIsEditorReady] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
	const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
	const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
	const [publicationBlocks, setPublicationBlocks] = useState<Block[]>([]);
	const [publicationSettings, setPublicationSettings] = useState(INITIAL_PUBLICATION_SETTINGS);
	const [documentErrors, setDocumentErrors] = useState<PostDocumentErrors>({});
	const [cologError, setCologError] = useState<string>();

	const performNavigation = useCallback(
		(href: string) => {
			if (navigate !== undefined) {
				navigate(href);
				return;
			}

			router.push(href);
		},
		[navigate, router],
	);

	const handleNavigationAttempt = useCallback(() => {
		setIsLeaveModalOpen(true);
	}, []);

	const { cancelPendingNavigation, continuePendingNavigation } = useUnsavedChangesGuard({
		isDirty,
		onNavigationAttempt: handleNavigationAttempt,
		onNavigate: performNavigation,
	});

	useEffect(() => {
		titleRef.current?.focus();
	}, []);

	useEffect(
		() => () => {
			if (selectedImageUrlRef.current !== null) {
				URL.revokeObjectURL(selectedImageUrlRef.current);
			}
		},
		[],
	);

	const handleEditorReady = useCallback((blocks: Block[]) => {
		latestBlocksRef.current = blocks;
		setIsEditorReady(true);
	}, []);

	const handleEditorChange = useCallback((blocks: Block[]) => {
		latestBlocksRef.current = blocks;
		setIsDirty(true);
		setDocumentErrors((currentErrors) => ({ ...currentErrors, body: undefined }));
	}, []);

	const handleTitleChange = (nextTitle: string) => {
		setTitle(nextTitle);
		setIsDirty(true);
		setDocumentErrors((currentErrors) => ({ ...currentErrors, title: undefined }));
	};

	const handleOpenPublishSettings = () => {
		const nextErrors = validatePostDocument(title, latestBlocksRef.current);
		setDocumentErrors(nextErrors);

		if (nextErrors.title !== undefined) {
			titleRef.current?.focus();
			return;
		}

		if (nextErrors.body !== undefined) {
			editorRef.current?.focus();
			return;
		}

		setPublicationBlocks([...latestBlocksRef.current]);
		setIsPublishModalOpen(true);
	};

	const handleImageChange = (file: File | null) => {
		if (selectedImageUrlRef.current !== null) {
			URL.revokeObjectURL(selectedImageUrlRef.current);
		}

		const nextImageUrl = file === null ? null : URL.createObjectURL(file);
		selectedImageUrlRef.current = nextImageUrl;
		setSelectedImageUrl(nextImageUrl);
		setPublicationSettings((currentSettings) => ({ ...currentSettings, representativeImage: file }));
	};

	const handleSubmitSettings = () => {
		if (publicationSettings.blogId === null) {
			setCologError('Co-log를 선택해 주세요.');
		}
	};

	const handleCancelLeave = () => {
		cancelPendingNavigation();
		setIsLeaveModalOpen(false);
	};

	const handleConfirmLeave = () => {
		setIsLeaveModalOpen(false);
		setIsDirty(false);
		void continuePendingNavigation();
	};

	return (
		<div className="min-h-dvh bg-background text-text-primary" aria-busy={!isEditorReady}>
			<WritePublishActionBar isEditorReady={isEditorReady} onPublish={handleOpenPublishSettings} />
			<main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8 sm:py-16">
				<div className="min-h-136 px-5 py-8 sm:px-10 sm:py-12">
					<PostTitleField
						value={title}
						error={documentErrors.title}
						inputRef={titleRef}
						onChange={handleTitleChange}
						onEnter={() => editorRef.current?.focus()}
					/>
					<div className="my-7 h-px bg-border-default" />
					<PostBodyField
						editorComponent={editorComponent}
						editorRef={editorRef}
						error={documentErrors.body}
						onReady={handleEditorReady}
						onChange={handleEditorChange}
						uploadFile={uploadFile}
					/>
				</div>
			</main>

			<PublishSettingsModal
				open={isPublishModalOpen}
				postTitle={title.trim()}
				settings={publicationSettings}
				selectedImageUrl={selectedImageUrl}
				bodyBlocks={publicationBlocks}
				defaultImageUrl={DEFAULT_POST_COVER_PATH}
				cologOptions={COLOG_OPTIONS_MOCK}
				cologError={cologError}
				isPublishing={false}
				onClose={() => setIsPublishModalOpen(false)}
				onCategoryChange={(category) => {
					setPublicationSettings((currentSettings) => ({ ...currentSettings, category }));
				}}
				onCoLogChange={(blogId) => {
					setPublicationSettings((currentSettings) => ({ ...currentSettings, blogId }));
					setCologError(undefined);
				}}
				onImageChange={handleImageChange}
				onPublish={handleSubmitSettings}
			/>

			<ConfirmModal
				open={isLeaveModalOpen}
				title="작성 중인 글을 나갈까요?"
				description="저장되지 않은 내용은 복구할 수 없습니다."
				confirmLabel="나가기"
				cancelLabel="계속 작성"
				variant="danger"
				onConfirm={handleConfirmLeave}
				onCancel={handleCancelLeave}
			/>
		</div>
	);
}
