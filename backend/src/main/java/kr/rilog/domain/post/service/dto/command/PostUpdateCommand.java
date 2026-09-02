package kr.rilog.domain.post.service.dto.command;

import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostDetail;
import tools.jackson.databind.JsonNode;

public record PostUpdateCommand(
        String newSlug,
        String title,
        JsonNode content,
        Category category,
        PostVisibility visibility,
        String thumbnailImageUrl,
        Long chapterId
) {

    public PostDetail toDetail() {
        return new PostDetail(
                title,
                content,
                category,
                visibility,
                thumbnailImageUrl
        );
    }

}
