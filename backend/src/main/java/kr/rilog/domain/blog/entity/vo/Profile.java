package kr.rilog.domain.blog.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Profile {

    @Column(length = 20, nullable = false)
    private String name; // NOTE - 팀블로그명 or 개인블로그명(사용자명)

    @Column(length = 80)
    private String introduction;

    @Column(length = 512)
    private String profileImageUrl;

    @Column(length = 512)
    private String coverImageUrl;

    @Column(length = 512)
    private String email;

    @Column(length = 512)
    private String serviceUrl;

    @Column(length = 512)
    private String githubUrl;

    private Profile(
            String name,
            String introduction,
            String profileImageUrl,
            String coverImageUrl,
            String email,
            String serviceUrl,
            String githubUrl
    ) {
        this.name = name;
        this.introduction = introduction;
        this.profileImageUrl = profileImageUrl;
        this.coverImageUrl = coverImageUrl;
        this.email = email;
        this.serviceUrl = serviceUrl;
        this.githubUrl = githubUrl;
    }

    public static Profile createColog(
            String name,
            String introduction,
            String profileImageUrl,
            String coverImageUrl,
            String serviceUrl,
            String githubUrl,
            String email
    ) {
        return new Profile(
                name,
                introduction,
                profileImageUrl,
                coverImageUrl,
                email,
                serviceUrl,
                githubUrl
        );
    }

    public static Profile createRilog(
            String name,
            String introduction,
            String profileImageUrl,
            String email,
            String githubUrl
    ) {

        return new Profile(
                name,
                introduction,
                profileImageUrl,
                null,
                email,
                null,
                githubUrl
        );
    }

}
