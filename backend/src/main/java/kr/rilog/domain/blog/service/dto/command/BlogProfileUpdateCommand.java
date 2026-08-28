package kr.rilog.domain.blog.service.dto.command;

import kr.rilog.domain.blog.entity.vo.Profile;

public record BlogProfileUpdateCommand(

        String profileImageUrl,
        String coverImageUrl,
        String name,
        String introduction,
        String serviceUrl,
        String githubUrl,
        String email

) {

    public Profile toProfile() {
        return Profile.createColog(
                name,
                introduction,
                profileImageUrl,
                coverImageUrl,
                serviceUrl,
                githubUrl,
                email
        );
    }

}
