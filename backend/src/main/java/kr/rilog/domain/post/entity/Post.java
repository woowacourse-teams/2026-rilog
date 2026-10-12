package kr.rilog.domain.post.entity;

import jakarta.persistence.*;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.Objects;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.DUPLICATED_PUBLISH;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_THE_RILOG_METADATA;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_THE_RILOG_POST;
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

    public static final String THE_RILOG_BLOG_SLUG = "the_rilog";

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id")
    private Chapter chapter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Default
    private PostType postType = PostType.STANDARD;

    @Column(length = 100, nullable = true)
    private String description;

    @OneToOne(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private PostSource source;

    @Column(length = 512)
    private String title;

    @Embedded
    private PostContent content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostVisibility visibility;

    @Column(length = 512)
    private String thumbnailImageUrl;

    private LocalDateTime publishedAt;

    // THINK Mapper ... ?
    public static Post create(
            Blog colog,
            Blog rilog,
            User owner,
            PostDetail detail,
            Chapter chapter
    ) {
        return Post.builder()
                .colog(colog)
                .rilog(rilog)
                .user(owner)
                .chapter(chapter)
                .title(detail.title())
                .content(PostContent.from(detail.content()))
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
                               PostDetail detail,
                               Chapter chapter
    ) {
        return Post.builder()
                .colog(null)
                .rilog(rilog)
                .user(owner)
                .chapter(chapter)
                .title(detail.title())
                .content(PostContent.from(detail.content()))
                .category(detail.category())
                .visibility(detail.visibility())
                .thumbnailImageUrl(detail.thumbnailUrl())
                .publishedAt(LocalDateTime.now())
                .status(PUBLISHED)
                .build();
    }

    public static Post createTheRilog(Blog blog, User writer, PostDetail detail, Chapter chapter, TheRilogPostMetadata metadata) {
        if (metadata == null) {
            throw new PostException(INVALID_THE_RILOG_METADATA);
        }
        validateTheRilogPost(metadata.postType(), detail, blog, chapter);
        blog.validateIsOwner(writer);
        Post post = create(blog, writer, detail, chapter);
        post.postType = metadata.postType();
        post.description = metadata.description();
        if (post.postType.isSpotlight()) {
            post.source = PostSource.create(post, metadata);
        }
        return post;
    }

    private static void validateTheRilogPost(PostType type, PostDetail detail, Blog blog, Chapter chapter) {
        validateTheRilogBlog(blog);
        validateTheRilogChapter(blog, chapter);
        validateTheRilogDetail(type, detail);
    }

    private static void validateTheRilogBlog(Blog blog) {
        if (blog == null || blog.isColog() || !THE_RILOG_BLOG_SLUG.equals(blog.getSlug())) {
            throw new PostException(INVALID_THE_RILOG_POST);
        }
    }

    private static void validateTheRilogChapter(Blog blog, Chapter chapter) {
        if (chapter == null || chapter.getDeletedAt() != null
                || !sameBlog(blog, chapter.getBlog())) {
            throw new PostException(INVALID_THE_RILOG_POST);
        }
    }

    private static void validateTheRilogDetail(PostType type, PostDetail detail) {
        if (detail == null || detail.category() == null || detail.visibility() == null
                || TheRilogPostMetadata.isBlankOrTooLong(detail.title(), type.isSpotlight() ? 20 : 512)) {
            throw new PostException(INVALID_THE_RILOG_POST);
        }
    }

    private static boolean sameBlog(Blog first, Blog second) {
        return first == second || first != null && second != null && first.getId() != null
                && first.getId().equals(second.getId());
    }

    public static Post draft(DraftSaveCommand command, User author, Blog rilog) {
        return Post.builder()
                .user(author)
                .rilog(rilog)
                .title(command.title())
                .content(PostContent.from(command.content()))
                .status(PostStatus.DRAFT)
                .visibility(PostVisibility.PRIVATE)
                .publishedAt(LocalDateTime.now())
                .build();
    }

    public void update(PostDetail detail, Blog targetBlog, Chapter chapter) {
        validateTargetBlog(targetBlog);
        PostContent updatedContent = PostContent.from(detail.content());
        this.category = detail.category();
        this.visibility = detail.visibility();
        this.title = detail.title();
        this.content = updatedContent;
        this.thumbnailImageUrl = detail.thumbnailUrl();
        this.colog = targetBlog.isColog() ? targetBlog : null;
        this.chapter = chapter;
    }

    public void update(PostDetail detail, Blog targetBlog) {
        update(detail, targetBlog, null);
    }

    public void publish(Blog rilog, Blog targetBlog, PostDetail detail, Chapter chapter) {
        validateIsDraft();
        this.rilog = rilog;
        this.colog = targetBlog.isColog() ? targetBlog : null;
        this.category = detail.category();
        this.visibility = detail.visibility();
        this.title = detail.title();
        this.content = PostContent.from(detail.content());
        this.thumbnailImageUrl = detail.thumbnailUrl();
        this.chapter = chapter;
        this.status = PUBLISHED;
        this.publishedAt = LocalDateTime.now();
    }

    public void publish(Blog rilog, Blog targetBlog, PostDetail detail) {
        publish(rilog, targetBlog, detail, null);
    }

    public void overwriteDraft(DraftOverwriteCommand command) {
        this.title = command.title();
        this.content = PostContent.from(command.content());
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

    public TextBlock findTextBlock(String blockId) {
        return content.findTextBlock(blockId);
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
        return user != null
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

    public TagAssets getTagAssets() {
        return content
                .extractTagAssets()
                .plus(thumbnailImageUrl);
    }

}
