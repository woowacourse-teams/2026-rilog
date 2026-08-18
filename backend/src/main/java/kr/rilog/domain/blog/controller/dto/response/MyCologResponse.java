package kr.rilog.domain.blog.controller.dto.response;

import kr.rilog.domain.blog.entity.Blog;

public record MyCologResponse(
        Long cologId,
        String slug,
        String name,
        String profileImageUrl
) {

    public static MyCologResponse of(Blog blog) {
        return new MyCologResponse(
                blog.getId(),
                blog.getSlug(),
                blog.getName(),
                blog.getProfileImageUrl()
        );
    }

}
