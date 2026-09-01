package kr.rilog.domain.blog.controller.dto.response;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.service.dto.result.BlogIndexResult;

import java.util.List;

public record BlogIndexResponse(
        BlogType blogType,
        long totalCount,
        List<ChapterIndexResponse> chapterIndexes,
        List<CologIndexResponse> cologIndexes
) {

    public static BlogIndexResponse from(BlogIndexResult result) {
        List<ChapterIndexResponse> chapters = result.chapters().stream()
                .map(ChapterIndexResponse::of)
                .toList();

        if (result.cologs() == null) {
            return new BlogIndexResponse(
                    result.blogType(),
                    result.totalCount(),
                    chapters,
                    null
            );
        }

        List<CologIndexResponse> cologs = result.cologs().stream()
                .map(CologIndexResponse::of)
                .toList();

        return new BlogIndexResponse(
                result.blogType(),
                result.totalCount(),
                chapters,
                cologs
        );
    }

    public record ChapterIndexResponse(
            Long id,
            String name,
            long postCount
    ) {

        private static ChapterIndexResponse of(BlogIndexResult.ChapterIndexResult result) {
            return new ChapterIndexResponse(
                    result.chapterId(),
                    result.chapterName(),
                    result.postCount()
            );
        }

    }

    public record CologIndexResponse(
            Long id,
            String name,
            String slug,
            String profileImageUrl,
            long authoredPostCount
    ) {

        private static CologIndexResponse of(BlogIndexResult.CologIndexResult result) {
            return new CologIndexResponse(
                    result.cologId(),
                    result.cologName(),
                    result.cologSlug(),
                    result.coloProfileImageUrl(),
                    result.authoredPostCount()
            );
        }

    }

}
