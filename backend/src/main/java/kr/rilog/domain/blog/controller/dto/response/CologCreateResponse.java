package kr.rilog.domain.blog.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;

@Schema(description = "팀 블로그 생성 응답")
public record CologCreateResponse(

        @Schema(description = "생성된 팀 블로그 ID", example = "1")
        Long id,

        @Schema(description = "팀 블로그 이름", example = "리로그 팀")
        String name,

        @Schema(description = "팀 블로그 slug", example = "rilog-team")
        String slug
) {

    public static CologCreateResponse from(CologCreateResult result) {
        return new CologCreateResponse(result.id(), result.name(), result.slug());
    }
}
