package kr.rilog.domain.post.controller.dto.response.owner;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;

public record RilogOwnerResponse(
        BlogType type,
        Long blogId,
        String slug,
        String name,
        String profileImageUrl
) implements PostOwnerResponse {

    public static RilogOwnerResponse from(Blog rilog) {
        return new RilogOwnerResponse(
                BlogType.RILOG,
                rilog.getId(),
                rilog.getSlug(),
                rilog.getName(),
                rilog.getProfileImageUrl()
        );
    }
}
