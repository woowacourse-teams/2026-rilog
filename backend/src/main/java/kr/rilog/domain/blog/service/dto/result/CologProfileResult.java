package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;

public record CologProfileResult(
        Long id,
        String name,
        String slug,
        String introduction,
        String logoUrl,
        String coverImageUrl
) {

    public static CologProfileResult from(Blog colog) {
        return new CologProfileResult(
                colog.getId(),
                colog.getName(),
                colog.getSlug(),
                colog.getIntroduction(),
                colog.getLogoUrl(),
                colog.getCoverImageUrl()
        );
    }
}
