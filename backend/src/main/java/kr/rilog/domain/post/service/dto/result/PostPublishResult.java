package kr.rilog.domain.post.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.post.entity.Post;

public record PostPublishResult(
        Long postId,
        String slug
) {

    public static PostPublishResult of(Post post, Blog publishingBlog) {
        return new PostPublishResult(post.getId(), publishingBlog.getSlug());
    }

}
