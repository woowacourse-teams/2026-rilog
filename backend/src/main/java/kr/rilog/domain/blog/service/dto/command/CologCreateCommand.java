package kr.rilog.domain.blog.service.dto.command;

import kr.rilog.domain.blog.entity.vo.Profile;

public record CologCreateCommand(
        String name,
        String slug,
        String introduction,
        String profileImageUrl,
        String coverImageUrl,
        String serviceUrl,
        String githubUrl
) {

    public Profile toProfile() {
        return Profile.createColog(
                name,
                slug,
                introduction,
                profileImageUrl,
                coverImageUrl,
                serviceUrl,
                githubUrl
        );
    }

}
