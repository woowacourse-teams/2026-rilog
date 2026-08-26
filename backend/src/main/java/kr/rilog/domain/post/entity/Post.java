package kr.rilog.domain.post.entity;

import jakarta.persistence.*;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
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
import java.util.Objects;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.DUPLICATED_PUBLISH;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
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
    @JoinColumn(name = "rilog_id", nullable = false)
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
    @Column(nullable = true)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status;

    @Enumerated(EnumType.STRING)
    private PostVisibility visibility;

    @Column(length = 512)
    private String thumbnailImageUrl;

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
                .thumbnailImageUrl(detail.thumbnailUrl())
                .publishedAt(LocalDateTime.now())
                .status(PUBLISHED)
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
                .thumbnailImageUrl(detail.thumbnailUrl())
                .publishedAt(LocalDateTime.now())
                .status(PUBLISHED)
                .build();
    }

    public static Post draft(DraftSaveCommand command, User author, Blog rilog) {
        return Post.builder()
                .user(author)
                .rilog(rilog)
                .title(command.title())
                .content(command.content())
                .status(PostStatus.DRAFT)
                .visibility(PostVisibility.PRIVATE)
                .publishedAt(LocalDateTime.now())
                .build();
    }

    public void update(PostDetail detail, Blog targetBlog) {
        validateTargetBlog(targetBlog);
        this.category = detail.category();
        this.visibility = detail.visibility();
        this.title = detail.title();
        this.content = detail.content();
        this.thumbnailImageUrl = detail.thumbnailUrl();
        this.colog = targetBlog.isColog() ? targetBlog : null;
    }

    public void publish(Blog rilog, Blog targetBlog, PostDetail detail) {
        validateIsDraft();
        this.rilog = rilog;
        this.colog = targetBlog.isColog() ? targetBlog : null;
        this.category = detail.category();
        this.visibility = detail.visibility();
        this.title = detail.title();
        this.content = detail.content();
        this.thumbnailImageUrl = detail.thumbnailUrl();
        this.status = PUBLISHED;
        this.publishedAt = LocalDateTime.now();
    }

    public void overwriteDraft(DraftOverwriteCommand command) {
        this.title = command.title();
        this.content = command.content();
        this.publishedAt = LocalDateTime.now();
    }

    private void validateIsDraft() {
        if(status != PostStatus.DRAFT) {
            throw new PostException(DUPLICATED_PUBLISH);
        }
    }

    private void validateTargetBlog(Blog targetBlog) {
        if (!targetBlog.isColog() && !isOwnRilog(targetBlog)) {
            throw new BlogException(RILOG_POST_PUBLISH_FORBIDDEN);
        }
    }

    public void validateReadableBy(Long requesterId) {
        if (!isPrivate()) {
            return;
        }

        if (!isWrittenBy(requesterId)) {
            throw new PostException(PRIVATE_POST_READ_FORBIDDEN);
        }
    }

    public boolean isPrivate() {
        return visibility == PostVisibility.PRIVATE;
    }

    public void validateWrittenBy(Long requesterId) {
        if (!isWrittenBy(requesterId)) {
            throw new PostException(NOT_POST_AUTHOR);
        }
    }

    public boolean isWrittenBy(Long requesterId) {
        return requesterId != null
                && user != null
                && user.getId() != null
                && user.getId().equals(requesterId);
    }

    public boolean isCologAffiliated() {
        return colog != null;
    }

    public String getOwnSlug() {
        if (isCologAffiliated()) {
            return getColog().getSlug();
        }

        return getRilog().getSlug();
    }

    public Long getOwnBlogId() {
        if (isCologAffiliated()) {
            return getColog().getId();
        }

        return getRilog().getId();
    }

    private boolean isOwnRilog(Blog targetBlog) {
        return rilog == targetBlog || Objects.equals(rilog.getId(), targetBlog.getId());
    }

}
