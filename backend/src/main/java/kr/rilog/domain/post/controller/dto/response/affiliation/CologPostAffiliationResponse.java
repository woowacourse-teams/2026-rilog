package kr.rilog.domain.post.controller.dto.response.affiliation;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;

public record CologPostAffiliationResponse(
        BlogType type,
        Long blogId,
        String slug,
        String name,
        String logoImageUrl,
        String coverImageUrl,
        long memberCount,
        long postCount
) implements PostBlogAffiliationResponse {

    public static CologPostAffiliationResponse of(
            Blog colog,
            long memberCount,
            long postCount
    ) {
        return new CologPostAffiliationResponse(
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
