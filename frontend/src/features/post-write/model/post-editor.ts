import type { EditorDocument } from './post-publication';
import type { Ref } from 'react';

import type { PostContentBlock } from '@/domains/post/model/post-content';

export interface PostEditorHandle {
	focus: () => void;
}

export interface PostEditorProps {
	initialBlocks?: PostContentBlock[];
	onChange: (blocks: PostContentBlock[]) => void;
	onReady: (blocks: PostContentBlock[]) => void;
	uploadFile: UploadPostBodyFile;
	ariaDescribedBy?: string;
	ref?: Ref<PostEditorHandle>;
}

export type UploadPostBodyFile = (file: File) => Promise<string>;

export interface PostWriteEditorContext {
	isEditorReady: boolean;
	isDirty: boolean;
	prepareDocument: () => EditorDocument | null;
	markClean: () => void;
	openPublishSettings: () => void;
}
