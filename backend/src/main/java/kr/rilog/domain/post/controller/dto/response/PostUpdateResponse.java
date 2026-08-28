package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.post.service.dto.result.PostUpdateResult;

public record PostUpdateResponse(
        Long postId,
        String slug
) {

    public static PostUpdateResponse from(PostUpdateResult result) {
        return new PostUpdateResponse(result.postId(), result.slug());
    }
}
