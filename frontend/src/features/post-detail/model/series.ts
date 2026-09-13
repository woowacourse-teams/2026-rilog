import type { ChapterSummary } from '@/domains/chapter/model/chapter';
import type { PostSummary } from '@/domains/post/model/post';

export type SeriesPost = Pick<PostSummary, 'id' | 'title'>;

export interface SeriesChapter extends ChapterSummary {
	posts: SeriesPost[];
}
