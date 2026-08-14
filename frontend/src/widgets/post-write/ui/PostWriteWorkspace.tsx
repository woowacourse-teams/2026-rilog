'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Block } from '@blocknote/core';
import type { ComponentType } from 'react';

import { mockUploadPostBodyFile } from '@/features/post-write/lib/mock-upload-post-body-file';
import type { PostEditorHandle, PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';

interface PostWriteWorkspaceProps {
	editorComponent?: ComponentType<PostEditorProps>;
	uploadFile?: UploadPostBodyFile;
}

export default function PostWriteWorkspace({
	editorComponent = DynamicBlockNoteEditor,
	uploadFile = mockUploadPostBodyFile,
}: PostWriteWorkspaceProps) {
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const editorRef = useRef<PostEditorHandle>(null);
	const latestBlocksRef = useRef<Block[]>([]);

	const [title, setTitle] = useState('');
	const [isEditorReady, setIsEditorReady] = useState(false);

	useEffect(() => {
		titleRef.current?.focus();
	}, []);

	const handleEditorReady = useCallback((blocks: Block[]) => {
		latestBlocksRef.current = blocks;
		setIsEditorReady(true);
	}, []);

	const handleEditorChange = useCallback((blocks: Block[]) => {
		latestBlocksRef.current = blocks;
	}, []);

	return (
		<div className="min-h-dvh bg-background text-text-primary" aria-busy={!isEditorReady}>
			<main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8 sm:py-16">
				<div className="min-h-136 px-5 py-8 sm:px-10 sm:py-12">
					<PostTitleField
						value={title}
						inputRef={titleRef}
						onChange={setTitle}
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
		</div>
	);
}
