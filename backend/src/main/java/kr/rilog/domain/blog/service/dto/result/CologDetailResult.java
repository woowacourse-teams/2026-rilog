package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.user.entity.User;

public record CologDetailResult(
        Long id,
        String name,
        String slug,
        String introduction,
        String logoUrl,
        String coverImageUrl,
        String serviceUrl,
        String githubUrl,
        UserResult user
) {

    public static CologDetailResult from(Blog colog) {
        return new CologDetailResult(
                colog.getId(),
                colog.getName(),
                colog.getSlug(),
                colog.getIntroduction(),
                colog.getLogoUrl(),
                colog.getCoverImageUrl(),
                colog.getServiceUrl(),
                colog.getGithubUrl(),
                UserResult.from(colog.getOwner())
        );
    }

    public record UserResult(
            Long id,
            String nickname,
            String slug,
            String profileImageUrl
    ) {

        public static UserResult from(User user) {
            return new UserResult(
                    user.getId(),
                    user.getNickname(),
                    user.getSlug(),
                    user.getProfileImageUrl()
            );
        }
    }
}
