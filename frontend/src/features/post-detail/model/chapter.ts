import type { Chapter } from '@/domains/chapter/model/chapter';
import type { PostSummary } from '@/domains/post/model/post';
import type { User } from '@/domains/user/model/user';

export type CologChapterPostAuthor = Pick<User, 'slug' | 'nickname'>;

export interface CologChapterPostSuggestion extends Pick<PostSummary, 'id' | 'title' | 'thumbnailUrl'> {
	author: CologChapterPostAuthor;
}

export interface CologChapterPostSuggestions extends Chapter {
	posts: readonly CologChapterPostSuggestion[];
}
