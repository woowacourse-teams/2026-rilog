import type { EditorDocument } from './post-publication';
import type { Block } from '@blocknote/core';
import type { Ref } from 'react';

export interface PostEditorHandle {
	focus: () => void;
}

export interface PostEditorProps {
	initialBlocks?: Block[];
	onChange: (blocks: Block[]) => void;
	onReady: (blocks: Block[]) => void;
	uploadFile: UploadPostBodyFile;
	ariaDescribedBy?: string;
	ref?: Ref<PostEditorHandle>;
}

export type UploadPostBodyFile = (file: File) => Promise<string>;

export interface PostWriteEditorContext {
	isEditorReady: boolean;
	isDirty: boolean;
	prepareDocument: () => EditorDocument | null;
	openPublishSettings: () => void;
}
