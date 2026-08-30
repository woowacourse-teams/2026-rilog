package kr.rilog.support.fixure;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.owner.RilogOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import kr.rilog.domain.post.service.dto.command.DraftPublishCommand;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.user.entity.User;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;

import java.time.LocalDateTime;

public final class PostFixture {

    private static final Long DEFAULT_WRITER_ID = 1L;
    private static final Category DEFAULT_CATEGORY = Category.TECH;
    private static final LocalDateTime DEFAULT_PUBLISHED_AT = LocalDateTime.of(2026, 8, 23, 12, 0);
    private static final String DEFAULT_TITLE = "게시글 제목";
    private static final String DEFAULT_THUMBNAIL_URL = "https://example.com/thumbnail.png";

    private PostFixture() {
    }

    public static DraftSaveCommand initialDraftSaveCommand() {
        return new DraftSaveCommand(DEFAULT_TITLE, content());
    }

    public static DraftOverwriteCommand overwrittenDraftCommand() {
        return new DraftOverwriteCommand(
                "덮어쓴 게시글 제목",
                JsonNodeFactory.instance.arrayNode().add(
                        JsonNodeFactory.instance.objectNode().put("body", "덮어쓴 본문")
                )
        );
    }

    public static DraftPublishCommand publicDraftPublishCommand(String slug) {
        return new DraftPublishCommand(
                slug,
                "발행된 게시글 제목",
                JsonNodeFactory.instance.arrayNode().add(
                        JsonNodeFactory.instance.objectNode().put("body", "발행된 본문")
                ),
                DEFAULT_CATEGORY,
                PostVisibility.PUBLIC,
                DEFAULT_THUMBNAIL_URL,
                null
        );
    }

    public static Post draftRilogPostAt(
            Blog rilog,
            User writer,
            String title,
            LocalDateTime publishedAt
    ) {
        return Post.builder()
                .user(writer)
                .rilog(rilog)
                .title(title)
                .content(PostContent.from(content()))
                .status(PostStatus.DRAFT)
                .visibility(PostVisibility.PRIVATE)
                .publishedAt(publishedAt)
                .build();
    }

    public static Post deletedDraftRilogPostAt(
            Blog rilog,
            User writer,
            String title,
            LocalDateTime publishedAt
    ) {
        Post post = draftRilogPostAt(rilog, writer, title, publishedAt);
        post.delete();
        return post;
    }

    public static PostSaveCommand publicPostPublishCommand(String slug) {
        return new PostSaveCommand(
                slug,
                DEFAULT_TITLE,
                content(),
                DEFAULT_CATEGORY,
                PostVisibility.PUBLIC,
                DEFAULT_THUMBNAIL_URL,
                null
        );
    }

    public static Post publicPublishedRilogPost() {
        User writer = BlogFixture.createUser(DEFAULT_WRITER_ID);
        Blog rilog = BlogFixture.createRilog(writer);
        return publicPublishedRilogPost(rilog, writer);
    }

    public static Post publicPublishedRilogPost(Blog rilog, User writer) {
        return builderForRilog(rilog, writer).build();
    }

    public static Post publicPublishedRilogPostAt(Blog rilog, User writer, LocalDateTime publishedAt) {
        return builderForRilog(rilog, writer)
                .publishedAt(publishedAt)
                .build();
    }

    public static Post privatePublishedRilogPost(Blog rilog, User writer) {
        return builderForRilog(rilog, writer)
                .visibility(PostVisibility.PRIVATE)
                .build();
    }

    public static Post privatePublishedRilogPost() {
        User writer = BlogFixture.createUser(DEFAULT_WRITER_ID);
        Blog rilog = BlogFixture.createRilog(writer);
        return privatePublishedRilogPost(rilog, writer);
    }

    public static Post publicDraftRilogPost(Blog rilog, User writer) {
        return builderForRilog(rilog, writer)
                .status(PostStatus.DRAFT)
                .publishedAt(null)
                .build();
    }

    public static Post deletedPublicPublishedRilogPost(Blog rilog, User writer) {
        Post post = publicPublishedRilogPost(rilog, writer);
        post.delete();
        return post;
    }

    public static Post publicPublishedColog(Blog rilog, Blog colog, User writer) {
        return builderForColog(rilog, colog, writer).build();
    }

    public static Post publicPublishedCologPost() {
        User writer = BlogFixture.createUser(DEFAULT_WRITER_ID);
        Blog rilog = BlogFixture.createRilog(writer);
        Blog colog = BlogFixture.createColog(writer);
        return publicPublishedColog(rilog, colog, writer);
    }

    public static Post publicPublishedColog(
            Blog rilog,
            Blog colog,
            User writer,
            LocalDateTime publishedAt
    ) {
        return builderForColog(rilog, colog, writer)
                .publishedAt(publishedAt)
                .build();
    }

    public static Post privatePublishedCologPost(Blog rilog, Blog colog, User writer) {
        return builderForColog(rilog, colog, writer)
                .visibility(PostVisibility.PRIVATE)
                .build();
    }

    public static Post publicDraftCologPost(Blog rilog, Blog colog, User writer) {
        return builderForColog(rilog, colog, writer)
                .status(PostStatus.DRAFT)
                .publishedAt(null)
                .build();
    }

    public static Post deletedPublicPublishedCologPost(Blog rilog, Blog colog, User writer) {
        Post post = publicPublishedColog(rilog, colog, writer);
        post.delete();
        return post;
    }

    public static PostDetailResponse postDetailResponse(Post post, User writer, Blog rilog) {
        return new PostDetailResponse(post.getTitle(),
                post.getContent().getContent(),
                post.getPublishedAt(),
                post.getThumbnailImageUrl(),
                post.getCategory().getName(),
                new PostDetailResponse.AuthorResponse(
                        writer.getNickname(),
                        writer.getId(),
                        writer.getSlug(),
                        writer.getProfileImageUrl()
                ),
                new RilogOwnerResponse(
                        rilog.getBlogType(),
                        rilog.getId(),
                        rilog.getSlug(),
                        rilog.getName(),
                        rilog.getProfileImageUrl()
                ),
                PostDetailResponse.ViewerPermissionsResponse.none()
        );
    }

    public static PostDetail updatedPostDetail() {
        return new PostDetail(
                "수정된 제목",
                JsonNodeFactory.instance.arrayNode().add(
                        JsonNodeFactory.instance.objectNode().put("body", "수정된 본문")
                ),
                Category.DAILY,
                PostVisibility.PRIVATE,
                "https://example.com/updated-thumbnail.png"
        );
    }

    public static PostUpdateCommand updateCommandTo(String newSlug) {
        PostDetail detail = updatedPostDetail();
        return new PostUpdateCommand(
                newSlug,
                detail.title(),
                detail.content(),
                detail.category(),
                detail.visibility(),
                detail.thumbnailUrl(),
                null
        );
    }

    private static Builder builderForRilog(Blog rilog, User writer) {
        return new Builder(rilog, writer);
    }

    private static Builder builderForColog(Blog rilog, Blog colog, User writer) {
        return builderForRilog(rilog, writer).colog(colog);
    }

    private static JsonNode content() {
        return JsonNodeFactory.instance.arrayNode().add(
                JsonNodeFactory.instance.objectNode().put("body", "본문")
        );
    }

    private static final class Builder {

        private final Blog rilog;
        private final User writer;
        private Blog colog;
        private String title = DEFAULT_TITLE;
        private JsonNode content = PostFixture.content();
        private Category category = DEFAULT_CATEGORY;
        private PostStatus status = PostStatus.PUBLISHED;
        private PostVisibility visibility = PostVisibility.PUBLIC;
        private String thumbnailImageUrl = DEFAULT_THUMBNAIL_URL;
        private LocalDateTime publishedAt = DEFAULT_PUBLISHED_AT;

        private Builder(Blog rilog, User writer) {
            this.rilog = rilog;
            this.writer = writer;
        }

        private Builder colog(Blog colog) {
            this.colog = colog;
            return this;
        }

        private Builder status(PostStatus status) {
            this.status = status;
            return this;
        }

        private Builder visibility(PostVisibility visibility) {
            this.visibility = visibility;
            return this;
        }

        private Builder publishedAt(LocalDateTime publishedAt) {
            this.publishedAt = publishedAt;
            return this;
        }

        private Post build() {
            return Post.builder()
                    .user(writer)
                    .rilog(rilog)
                    .colog(colog)
                    .title(title)
                    .content(PostContent.from(content))
                    .category(category)
                    .status(status)
                    .visibility(visibility)
                    .thumbnailImageUrl(thumbnailImageUrl)
                    .publishedAt(publishedAt)
                    .build();
        }
    }

}
