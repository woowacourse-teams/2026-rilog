'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Block } from '@blocknote/core';
import type { ComponentType } from 'react';

import { useUnsavedChangesGuard } from '@/features/post-write/hooks/use-unsaved-changes-guard';
import { mockUploadPostBodyFile } from '@/features/post-write/lib/mock-upload-post-body-file';
import type { PostEditorHandle, PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

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

	const [title, setTitle] = useState('');
	const [isEditorReady, setIsEditorReady] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

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

	const handleEditorReady = useCallback((blocks: Block[]) => {
		latestBlocksRef.current = blocks;
		setIsEditorReady(true);
	}, []);

	const handleEditorChange = useCallback((blocks: Block[]) => {
		latestBlocksRef.current = blocks;
		setIsDirty(true);
	}, []);

	const handleTitleChange = (nextTitle: string) => {
		setTitle(nextTitle);
		setIsDirty(true);
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
			<main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8 sm:py-16">
				<div className="min-h-136 px-5 py-8 sm:px-10 sm:py-12">
					<PostTitleField
						value={title}
						inputRef={titleRef}
						onChange={handleTitleChange}
						onEnter={() => editorRef.current?.focus()}
					/>
					<div className="my-7 h-px bg-border-default" />
					<PostBodyField
						editorComponent={editorComponent}
						editorRef={editorRef}
						onReady={handleEditorReady}
						onChange={handleEditorChange}
						uploadFile={uploadFile}
					/>
				</div>
			</main>

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
