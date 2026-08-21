package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;

public record CologPublicProfileResult(
        Long id,
        String name,
        String slug,
        String introduction,
        String profileImageUrl,
        String coverImageUrl,
        String serviceUrl,
        String githubUrl,
        long memberCount,
        long postCount
) {

    public static CologPublicProfileResult from(Blog colog, long memberCount, long postCount) {
        return new CologPublicProfileResult(
                colog.getId(),
                colog.getName(),
                colog.getSlug(),
                colog.getIntroduction(),
                colog.getProfileImageUrl(),
                colog.getCoverImageUrl(),
                colog.getServiceUrl(),
                colog.getGithubUrl(),
                memberCount,
                postCount
        );
    }
}
