package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import tools.jackson.databind.JsonNode;

public record PostDetail(
        String title,
        JsonNode content,
        Category category,
        PostVisibility visibility,
        String thumbnailUrl,
        String logoUrl
) {
}
