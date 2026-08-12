package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.post.service.dto.result.PostPublishResult;

public record PostPublishResponse(
        Long postId,
        String slug
) {

    public static PostPublishResponse from(PostPublishResult result) {
        return new PostPublishResponse(result.postId(), result.slug());
    }

}
