package kr.rilog.domain.post.controller.dto.response.owner;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.entity.enums.BlogType;

@Schema(
        description = "게시글과 블로그 사이의 소속 관계",
        oneOf = {
                RilogOwnerResponse.class,
                CologOwnerResponse.class
        },
        discriminatorProperty = "type"
)
public sealed interface PostOwnerResponse permits RilogOwnerResponse, CologOwnerResponse {
    BlogType type();
}
