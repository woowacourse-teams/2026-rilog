package kr.rilog.support.fixure;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.user.entity.User;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;

import java.time.LocalDateTime;

public final class PostFixture {

    private static final Category DEFAULT_CATEGORY = Category.TECH;
    private static final String DEFAULT_THUMBNAIL_URL = "https://example.com/thumbnail.png";

    private PostFixture() {
    }

    public static PostSaveCommand commandWithTitleAndVisibility(
            String title,
            PostVisibility visibility
    ) {
        return new PostSaveCommand(
                title,
                content(),
                DEFAULT_CATEGORY,
                visibility,
                DEFAULT_THUMBNAIL_URL
        );
    }

    public static PostDetail detailWithTitleAndVisibility(
            String title,
            PostVisibility visibility
    ) {
        return new PostDetail(
                title,
                content(),
                DEFAULT_CATEGORY,
                visibility,
                DEFAULT_THUMBNAIL_URL
        );
    }

    public static JsonNode content() {
        return contentWithBody("본문");
    }

    public static JsonNode contentWithBody(String body) {
        return JsonNodeFactory.instance.objectNode().put("body", body);
    }

    public static Builder builderForRilog(Blog rilog, User writer) {
        return new Builder(rilog, writer);
    }

    public static final class Builder {

        private final Blog rilog;
        private final User writer;
        private Blog colog;
        private String title = "게시글 제목";
        private JsonNode content = PostFixture.content();
        private Category category = DEFAULT_CATEGORY;
        private PostStatus status = PostStatus.PUBLISHED;
        private PostVisibility visibility = PostVisibility.PUBLIC;
        private String thumbnailImageUrl = DEFAULT_THUMBNAIL_URL;
        private LocalDateTime publishedAt = LocalDateTime.now();

        private Builder(Blog rilog, User writer) {
            this.rilog = rilog;
            this.writer = writer;
        }

        public Builder colog(Blog colog) {
            this.colog = colog;
            return this;
        }

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder content(JsonNode content) {
            this.content = content;
            return this;
        }

        public Builder category(Category category) {
            this.category = category;
            return this;
        }

        public Builder status(PostStatus status) {
            this.status = status;
            return this;
        }

        public Builder visibility(PostVisibility visibility) {
            this.visibility = visibility;
            return this;
        }

        public Builder thumbnailImageUrl(String thumbnailImageUrl) {
            this.thumbnailImageUrl = thumbnailImageUrl;
            return this;
        }

        public Builder publishedAt(LocalDateTime publishedAt) {
            this.publishedAt = publishedAt;
            return this;
        }

        public Post build() {
            return Post.builder()
                    .user(writer)
                    .rilog(rilog)
                    .colog(colog)
                    .title(title)
                    .content(content)
                    .category(category)
                    .status(status)
                    .visibility(visibility)
                    .thumbnailImageUrl(thumbnailImageUrl)
                    .publishedAt(publishedAt)
                    .build();
        }
    }

}
