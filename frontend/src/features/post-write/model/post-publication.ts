import type { Block } from '@blocknote/core';

import type { PostCategory } from '@/domains/post/model/post';

export interface EditorDocument {
	title: string;
	blocks: Block[];
}

export type TargetBlog = { type: 'RILOG'; slug: string } | { type: 'COLOG'; id: number; slug: string };

export interface PublicationSettings {
	category: PostCategory;
	blog: TargetBlog | null;
	chapterId: number | null;
	representativeImage: File | null;
	representativeImageUrl: string | null;
}

export interface PostWriteInitialData {
	authorId: number;
	document: EditorDocument;
	settings: PublicationSettings;
}

export interface PublishPostCommand {
	document: EditorDocument;
	settings: PublicationSettings;
}

export interface PublishPostResult {
	postId: string;
	slug: string;
}

export type PublishPost = (command: PublishPostCommand) => Promise<PublishPostResult>;
