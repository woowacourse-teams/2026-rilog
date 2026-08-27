import type { EditorDocument, PublishPost } from './post-publication';

export interface DraftCreationResult {
	draftId: number;
}

export type CreatePostDraft = (document: EditorDocument) => Promise<DraftCreationResult>;

export type UpdatePostDraft = (draftId: number, document: EditorDocument) => Promise<void>;

export type PublishPostDraft = (draftId: number, command: Parameters<PublishPost>[0]) => ReturnType<PublishPost>;
