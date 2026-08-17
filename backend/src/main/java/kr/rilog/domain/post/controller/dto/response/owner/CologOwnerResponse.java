package kr.rilog.domain.post.controller.dto.response.owner;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;

public record CologOwnerResponse(
        BlogType type,
        Long blogId,
        String slug,
        String name,
        String logoImageUrl,
        String coverImageUrl,
        long memberCount,
        long postCount
) implements PostOwnerResponse {

    public static CologOwnerResponse of(
            Blog colog,
            long memberCount,
            long postCount
    ) {
        return new CologOwnerResponse(
                BlogType.COLOG,
                colog.getId(),
                colog.getSlug(),
                colog.getName(),
                colog.getLogoUrl(),
                colog.getCoverImageUrl(),
                memberCount,
                postCount
        );
    }
}
