import type { Block } from '@blocknote/core';

import type { CologOption } from '@/domains/blog/model/colog';
import type { PostCategory } from '@/domains/post/model/post';

export interface EditorDocument {
	title: string;
	blocks: Block[];
}

export interface PublicationSettings {
	category: PostCategory;
	blog: CologOption | null;
	representativeImage: File | null;
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
