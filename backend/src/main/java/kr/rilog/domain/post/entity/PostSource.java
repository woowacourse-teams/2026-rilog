package kr.rilog.domain.post.entity;

import jakarta.persistence.*;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "post_source")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostSource extends BaseEntity {
    @Id
    private Long postId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(nullable = false, length = 255)
    private String sourceProfileName;

    @Column(length = 512)
    private String sourceProfileImage;

    static PostSource create(Post post, TheRilogPostMetadata metadata) {
        PostSource source = new PostSource();
        source.post = post;
        source.sourceProfileName = metadata.sourceProfileName();
        source.sourceProfileImage = metadata.sourceProfileImage();
        return source;
    }
}
