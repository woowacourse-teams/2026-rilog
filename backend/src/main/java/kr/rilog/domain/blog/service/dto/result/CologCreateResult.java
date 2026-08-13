package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;

public record CologCreateResult(
        Long id,
        String name,
        String slug
) {

    public static CologCreateResult from(Blog colog) {
        return new CologCreateResult(colog.getId(), colog.getName(), colog.getSlug());
    }
}
