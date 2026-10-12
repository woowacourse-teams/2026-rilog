package kr.rilog.domain.post.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostSource {

    @Column(name = "source_profile_name", length = 255)
    private String sourceProfileName;

    @Column(name = "source_profile_image", length = 512)
    private String sourceProfileImage;

    private PostSource(String sourceProfileName, String sourceProfileImage) {
        this.sourceProfileName = sourceProfileName;
        this.sourceProfileImage = sourceProfileImage;
    }

    public static PostSource create(String sourceProfileName, String sourceProfileImage) {
        return new PostSource(sourceProfileName, sourceProfileImage);
    }
}
