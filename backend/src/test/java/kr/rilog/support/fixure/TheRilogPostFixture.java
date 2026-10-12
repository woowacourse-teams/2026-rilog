package kr.rilog.support.fixure;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.PostSource;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.user.entity.User;

import java.time.LocalDateTime;

import static kr.rilog.domain.post.entity.enums.Category.TECH;

public final class TheRilogPostFixture {

    private static final String DEFAULT_DESCRIPTION = "기술 글 요약입니다.";
    private static final String DEFAULT_SOURCE_NAME = "공식 출처";
    private static final String DEFAULT_SOURCE_IMAGE = "https://example.com/source.png";
    private static final String DEFAULT_THUMBNAIL = "https://example.com/thumbnail.png";

    private TheRilogPostFixture() {
    }

    public static Post publishedNews(
            Blog theRilog,
            User editor,
            Chapter chapter,
            String title,
            LocalDateTime publishedAt,
            String... contentBlocks
    ) {
        return news(theRilog, editor, chapter, title, publishedAt, PostVisibility.PUBLIC, PostStatus.PUBLISHED, contentBlocks);
    }

    public static Post privateNews(
            Blog theRilog,
            User editor,
            Chapter chapter,
            String title,
            LocalDateTime publishedAt,
            String... contentBlocks
    ) {
        return news(theRilog, editor, chapter, title, publishedAt, PostVisibility.PRIVATE, PostStatus.PUBLISHED, contentBlocks);
    }

    public static Post draftNews(
            Blog theRilog,
            User editor,
            Chapter chapter,
            String title,
            LocalDateTime publishedAt,
            String... contentBlocks
    ) {
        return news(theRilog, editor, chapter, title, publishedAt, PostVisibility.PUBLIC, PostStatus.DRAFT, contentBlocks);
    }

    public static Post publishedSpotlight(
            Blog theRilog,
            User editor,
            Chapter chapter,
            PostType postType,
            String title,
            String sourceProfileName,
            LocalDateTime publishedAt
    ) {
        return spotlight(
                theRilog,
                editor,
                chapter,
                postType,
                title,
                DEFAULT_DESCRIPTION,
                sourceProfileName,
                DEFAULT_SOURCE_IMAGE,
                publishedAt,
                PostVisibility.PUBLIC,
                PostStatus.PUBLISHED
        );
    }

    public static Post publishedSpotlight(
            Blog theRilog,
            User editor,
            Chapter chapter,
            PostType postType,
            String title,
            String description,
            String sourceProfileName,
            String sourceProfileImage,
            LocalDateTime publishedAt
    ) {
        return spotlight(
                theRilog,
                editor,
                chapter,
                postType,
                title,
                description,
                sourceProfileName,
                sourceProfileImage,
                publishedAt,
                PostVisibility.PUBLIC,
                PostStatus.PUBLISHED
        );
    }

    public static Post privateSpotlight(
            Blog theRilog,
            User editor,
            Chapter chapter,
            PostType postType,
            String title,
            LocalDateTime publishedAt
    ) {
        return spotlight(
                theRilog,
                editor,
                chapter,
                postType,
                title,
                DEFAULT_DESCRIPTION,
                DEFAULT_SOURCE_NAME,
                DEFAULT_SOURCE_IMAGE,
                publishedAt,
                PostVisibility.PRIVATE,
                PostStatus.PUBLISHED
        );
    }

    public static Post draftSpotlight(
            Blog theRilog,
            User editor,
            Chapter chapter,
            PostType postType,
            String title,
            LocalDateTime publishedAt
    ) {
        return spotlight(
                theRilog,
                editor,
                chapter,
                postType,
                title,
                DEFAULT_DESCRIPTION,
                DEFAULT_SOURCE_NAME,
                DEFAULT_SOURCE_IMAGE,
                publishedAt,
                PostVisibility.PUBLIC,
                PostStatus.DRAFT
        );
    }

    private static Post news(
            Blog theRilog,
            User editor,
            Chapter chapter,
            String title,
            LocalDateTime publishedAt,
            PostVisibility visibility,
            PostStatus status,
            String... contentBlocks
    ) {
        Post.createTheRilog(
                theRilog,
                editor,
                new PostDetail(title, PostContentFixture.content(contentBlocks).getContent(), TECH, visibility, null),
                chapter,
                new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, null, null)
        );
        return Post.builder()
                .user(editor)
                .rilog(theRilog)
                .chapter(chapter)
                .postType(PostType.DAILY_HEADLINES)
                .title(title)
                .content(PostContentFixture.content(contentBlocks))
                .category(TECH)
                .visibility(visibility)
                .status(status)
                .publishedAt(publishedAt)
                .build();
    }

    private static Post spotlight(
            Blog theRilog,
            User editor,
            Chapter chapter,
            PostType postType,
            String title,
            String description,
            String sourceProfileName,
            String sourceProfileImage,
            LocalDateTime publishedAt,
            PostVisibility visibility,
            PostStatus status
    ) {
        Post.createTheRilog(
                theRilog,
                editor,
                new PostDetail(
                        title,
                        PostContentFixture.content(PostContentFixture.paragraph("본문")).getContent(),
                        TECH,
                        visibility,
                        DEFAULT_THUMBNAIL
                ),
                chapter,
                new TheRilogPostMetadata(postType, description, sourceProfileName, sourceProfileImage)
        );
        return Post.builder()
                .user(editor)
                .rilog(theRilog)
                .chapter(chapter)
                .postType(postType)
                .title(title)
                .description(description)
                .source(PostSource.create(sourceProfileName, sourceProfileImage))
                .content(PostContentFixture.content(PostContentFixture.paragraph("본문")))
                .category(TECH)
                .visibility(visibility)
                .thumbnailImageUrl(DEFAULT_THUMBNAIL)
                .status(status)
                .publishedAt(publishedAt)
                .build();
    }
}
