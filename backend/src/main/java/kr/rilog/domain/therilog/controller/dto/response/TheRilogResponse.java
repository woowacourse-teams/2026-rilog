package kr.rilog.domain.therilog.controller.dto.response;

import kr.rilog.domain.post.controller.dto.response.PostSourceResponse;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record TheRilogResponse(
        String blogSlug,
        LocalDate date,
        NewsResponse news,
        List<SpotlightResponse> spotlights
) {

    public static TheRilogResponse from(TheRilogResult result) {
        return new TheRilogResponse(
                result.blogSlug(),
                result.date(),
                NewsResponse.from(result.news(), result.blogSlug()),
                result.spotlights().stream()
                        .map(spotlight -> SpotlightResponse.from(spotlight, result.blogSlug()))
                        .toList()
        );
    }

    public record NewsResponse(
            Long postId,
            String slug,
            String title,
            LocalDateTime publishedAt,
            List<HeadlineResponse> headlines
    ) {

        private static NewsResponse from(TheRilogResult.NewsResult result, String slug) {
            if (result == null) {
                return null;
            }
            return new NewsResponse(
                    result.postId(), slug, result.title(), result.publishedAt(),
                    result.headlines().stream().map(HeadlineResponse::from).toList()
            );
        }
    }

    public record HeadlineResponse(String title) {

        private static HeadlineResponse from(TheRilogResult.HeadlineResult result) {
            return new HeadlineResponse(result.title());
        }
    }

    public record SpotlightResponse(
            Long postId,
            String slug,
            String articleType,
            String title,
            String description,
            String thumbnailImageUrl,
            LocalDateTime publishedAt,
            PostSourceResponse source
    ) {

        private static SpotlightResponse from(TheRilogResult.SpotlightResult result, String slug) {
            return new SpotlightResponse(
                    result.postId(),
                    slug,
                    articleType(result.postType()),
                    result.title(),
                    result.description(),
                    result.thumbnailImageUrl(),
                    result.publishedAt(),
                    result.source() == null ? null : new PostSourceResponse(
                            result.source().sourceProfileName(), result.source().sourceProfileImage())
            );
        }

        private static String articleType(PostType postType) {
            return switch (postType) {
                case ENTERPRISE_SPOTLIGHT -> "enterprise";
                case PERSONAL_SPOTLIGHT -> "personal";
                case STANDARD, DAILY_HEADLINES -> throw new IllegalStateException("스포트라이트 유형이 아닙니다.");
            };
        }
    }
}
