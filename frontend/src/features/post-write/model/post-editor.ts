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
	onMediaImportingChange?: (isImporting: boolean) => void;
	uploadFile: UploadPostBodyFile;
	ariaDescribedBy?: string;
	ref?: Ref<PostEditorHandle>;
}

export type UploadPostBodyFile = (file: File) => Promise<string>;

export interface PostWriteEditorContext {
	isEditorReady: boolean;
	isDirty: boolean;
	isMediaImporting?: boolean;
	prepareDocument: () => EditorDocument | null;
	markClean: () => void;
	openPublishSettings: () => void;
}
