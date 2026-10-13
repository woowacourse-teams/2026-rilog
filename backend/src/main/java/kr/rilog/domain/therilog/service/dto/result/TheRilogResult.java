package kr.rilog.domain.therilog.service.dto.result;

import kr.rilog.domain.post.entity.enums.PostType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record TheRilogResult(
        String blogSlug,
        LocalDate date,
        NewsResult news,
        List<SpotlightResult> spotlights
) {

    public record NewsResult(
            Long postId,
            String title,
            LocalDateTime publishedAt,
            List<HeadlineResult> headlines
    ) {
    }

    public record HeadlineResult(
            String title
    ) {
    }

    public record SpotlightResult(
            Long postId,
            PostType postType,
            String title,
            String description,
            String thumbnailImageUrl,
            LocalDateTime publishedAt,
            SourceResult source
    ) {
    }

    public record SourceResult(
            String sourceProfileName,
            String sourceProfileImage
    ) {
    }
}
