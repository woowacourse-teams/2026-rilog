import type { CologBlog } from '@/domains/blog/model/blog';

export interface MyCologPreviewResponse extends Pick<CologBlog, 'slug' | 'name'> {
	cologId: CologBlog['id'];
	logoUrl: CologBlog['profileImageUrl'];
}
