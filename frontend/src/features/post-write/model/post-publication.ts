import type { Block } from '@blocknote/core';

import type { PostCategory } from '@/domains/post/model/post-category';

export interface EditorDocument {
	title: string;
	blocks: Block[];
}

export interface PublicationSettings {
	category: PostCategory;
	blogId: number | null;
	representativeImage: File | null;
}
