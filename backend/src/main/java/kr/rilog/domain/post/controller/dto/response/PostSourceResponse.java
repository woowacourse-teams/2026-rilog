package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.post.entity.vo.PostSource;

public record PostSourceResponse(
        String sourceProfileName,
        String sourceProfileImage
) {

    public static PostSourceResponse from(PostSource source) {
        if (source == null) {
            return null;
        }
        return new PostSourceResponse(source.getSourceProfileName(), source.getSourceProfileImage());
    }
}
