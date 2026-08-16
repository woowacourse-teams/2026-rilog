package kr.rilog.domain.post.controller.dto.response.affiliation;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.entity.enums.BlogType;

@Schema(
        description = "게시글과 블로그 사이의 소속 관계",
        oneOf = {
                RilogPostAffiliationResponse.class,
                CologPostAffiliationResponse.class
        },
        discriminatorProperty = "type"
)
public sealed interface PostBlogAffiliationResponse permits RilogPostAffiliationResponse, CologPostAffiliationResponse {
    BlogType type();
}
