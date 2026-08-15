package kr.rilog.domain.post.entity;

import jakarta.persistence.*;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;

import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;

/**
 * NOTE
 * rilog는 개인 블로그,
 * colog는 팀 블로그를 의미한다.
 *
 */

@Getter
@Entity
@Table(name = "post")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rilog_id", nullable = true)
    private Blog rilog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "colog_id", nullable = true)
    private Blog colog;

    @Column(length = 512)
    private String title;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private JsonNode content; // THINK JsonNode 포장.

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status;

    @Enumerated(EnumType.STRING)
    private PostVisibility visibility;

    @Column(length = 512)
    private String thumbnailUrl;

    private LocalDateTime publishedAt;

//    private Chapter chapter; // TODO 챕터 or 시리즈 추가 시, 구현 필요

    // THINK Mapper ... ?
    public static Post create(
            Blog colog,
            Blog rilog,
            User owner,
            PostDetail detail
    ) {
        return Post.builder()
                .colog(colog)
                .rilog(rilog)
                .user(owner)
                .title(detail.title())
                .content(detail.content())
                .category(detail.category())
                .visibility(detail.visibility())
                .thumbnailUrl(detail.thumbnailUrl())
                .publishedAt(LocalDateTime.now())
                .status(PostStatus.PUBLISHED)
                .build();
    }

    public static Post create( // THINK Mapper ... ?
                               Blog rilog,
                               User owner,
                               PostDetail detail
    ) {
        return Post.builder()
                .colog(null)
                .rilog(rilog)
                .user(owner)
                .title(detail.title())
                .content(detail.content())
                .category(detail.category())
                .visibility(detail.visibility())
                .thumbnailUrl(detail.thumbnailUrl())
                .publishedAt(LocalDateTime.now())
                .status(PostStatus.PUBLISHED)
                .build();
    }

    public void validateReadableBy(Long requesterId) {
        if (isPrivate() && !isWrittenBy(requesterId)) {
            throw new PostException(PRIVATE_POST_READ_FORBIDDEN);
        }
    }

    public boolean isPrivate() {
        return visibility == PostVisibility.PRIVATE;
    }

    public boolean isWrittenBy(Long requesterId) {
        return requesterId != null
                && user != null
                && user.getId() != null
                && user.getId().equals(requesterId);
    }

}
