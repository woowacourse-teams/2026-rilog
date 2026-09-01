package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.repository.projection.CologIndexProjection;
import kr.rilog.domain.chapter.repository.projection.ChapterIndexProjection;

import java.util.List;

public record BlogIndexResult(
        BlogType blogType,
        long totalCount,
        List<ChapterIndexResult> chapters,
        List<CologIndexResult> cologs
) {

    public static BlogIndexResult of(
            BlogType blogType,
            long totalCount,
            List<ChapterIndexProjection> chapterProjections,
            List<CologIndexProjection> cologProjections
    ) {
        List<ChapterIndexResult> chapters = chapterProjections.stream()
                .map(ChapterIndexResult::of)
                .toList();

        List<CologIndexResult> cologs = cologProjections.stream()
                .map(CologIndexResult::of)
                .toList();

        return new BlogIndexResult(blogType, totalCount, chapters, cologs);
    }

    public static BlogIndexResult of(BlogType blogType, long totalCount, List<ChapterIndexProjection> chapterProjections) {
        List<ChapterIndexResult> chapters = chapterProjections.stream()
                .map(ChapterIndexResult::of)
                .toList();

        return new BlogIndexResult(blogType, totalCount, chapters, null);
    }

    public record ChapterIndexResult(
            Long chapterId,
            String chapterName,
            long postCount
    ) {

        private static ChapterIndexResult of(ChapterIndexProjection projection) {
            return new ChapterIndexResult(
                    projection.chapterId(),
                    projection.chapterName(),
                    projection.postCount()
            );
        }

    }

    public record CologIndexResult(
            Long cologId,
            String cologName,
            String cologSlug,
            String cologProfileImageUrl,
            long authoredPostCount
    ) {

        private static CologIndexResult of(CologIndexProjection projection) {
            return new CologIndexResult(
                    projection.cologId(),
                    projection.cologName(),
                    projection.cologSlug(),
                    projection.cologProfileImageUrl(),
                    projection.authoredPostCount()
            );
        }

    }

}
