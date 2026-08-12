package kr.rilog.domain.blog.entity;

import jakarta.persistence.*;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@Entity
@Table(name = "blog")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Blog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(length = 20, nullable = false)
    private String name; // NOTE - 팀블로그명 or 개인블로그명(사용자명)

    @Column(length = 20, nullable = false, unique = true, updatable = false)
    private String slug;

    @Column(length = 80)
    private String introduction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlogType blogType;

    @Column(length = 512)
    private String coverImageUrl;

    @Column(length = 512)
    private String serviceUrl;

    public boolean isColog() {
        return this.blogType == BlogType.COLOG;
    }

}
