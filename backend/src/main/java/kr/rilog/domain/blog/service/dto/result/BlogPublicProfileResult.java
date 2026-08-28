package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;

public record BlogPublicProfileResult(
        BlogType type,
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

    public static BlogPublicProfileResult from(Blog blog, long memberCount, long postCount) {
        return new BlogPublicProfileResult(
                blog.getBlogType(),
                blog.getId(),
                blog.getName(),
                blog.getSlug(),
                blog.getIntroduction(),
                blog.getProfileImageUrl(),
                blog.getCoverImageUrl(),
                blog.getServiceUrl(),
                blog.getGithubUrl(),
                memberCount,
                postCount
        );
    }
}
