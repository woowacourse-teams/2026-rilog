package kr.rilog.domain.post.controller.dto.response.affiliation;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;

public record RilogPostAffiliationResponse(
        BlogType type,
        Long blogId,
        String slug,
        String name,
        String profileImageUrl
) implements PostBlogAffiliationResponse {

    public static RilogPostAffiliationResponse from(Blog rilog) {
        return new RilogPostAffiliationResponse(
                BlogType.RILOG,
                rilog.getId(),
                rilog.getSlug(),
                rilog.getName(),
                rilog.getLogoUrl()
        );
    }
}
