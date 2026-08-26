'use client';

import type { ComponentType } from 'react';

import type { PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublicationSettings, PublishPost } from '@/features/post-write/model/post-publication';

import { useUpdatePublishedPost } from '../hooks/use-post-publishers';

import EditPostActions from './EditPostActions';
import PostWriteWorkspace from './PostWriteWorkspace';

interface EditPostControllerProps {
	postId: number;
	initialDocument: EditorDocument;
	initialPublicationSettings: PublicationSettings;
	publishPost?: PublishPost;
	editorComponent?: ComponentType<PostEditorProps>;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
}

export default function EditPostController({
	postId,
	initialDocument,
	initialPublicationSettings,
	publishPost,
	editorComponent,
	uploadFile,
	navigate,
}: EditPostControllerProps) {
	const updatePost = useUpdatePublishedPost(postId);

	return (
		<PostWriteWorkspace
			publishPost={publishPost ?? updatePost}
			initialDocument={initialDocument}
			initialPublicationSettings={initialPublicationSettings}
			editorComponent={editorComponent}
			uploadFile={uploadFile}
			navigate={navigate}
		>
			{(editor) => <EditPostActions editor={editor} />}
		</PostWriteWorkspace>
	);
}
