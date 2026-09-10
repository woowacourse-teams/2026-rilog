import type { OrderedChapter } from '@/domains/chapter/model/chapter';
import { getSeriesPosts } from '@/features/post-detail/lib/get-series-posts';
import SeriesAccordion from '@/features/post-detail/ui/SeriesAccordion';

interface SeriesAccordionSectionProps {
	slug: string;
	postId: number;
	chapter: OrderedChapter;
}

export default async function SeriesAccordionSection({ slug, postId, chapter }: SeriesAccordionSectionProps) {
	const series = await getSeriesPosts({ slug, chapter });

	if (series === null || series.posts.length === 0) {
		return null;
	}

	return <SeriesAccordion slug={slug} postId={postId} series={series} />;
}
