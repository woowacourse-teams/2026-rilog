import type { OrderedChapter } from '@/domains/chapter/model/chapter';
import { getChapterPostSuggestions } from '@/features/post-detail/lib/get-chapter-post-suggestions';
import ChapterPostSuggestion from '@/features/post-detail/ui/ChapterPostSuggestion';

interface ChapterPostSuggestionSectionProps {
	slug: string;
	chapter: OrderedChapter;
	currentPostId: number;
}

export default async function ChapterPostSuggestionSection({
	slug,
	chapter,
	currentPostId,
}: ChapterPostSuggestionSectionProps) {
	const suggestions = await getChapterPostSuggestions({ slug, chapter, currentPostId });

	if (suggestions === null || suggestions.posts.length === 0) {
		return null;
	}

	return <ChapterPostSuggestion slug={slug} chapter={suggestions} />;
}
