package kr.rilog.domain.post.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.post.entity.Post;

public record PostUpdateResult(
        Long postId,
        String slug
) {

    public static PostUpdateResult of(Post post, Blog blog) {
        return new PostUpdateResult(post.getId(), blog.getSlug());
    }
}
