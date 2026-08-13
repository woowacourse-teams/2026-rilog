package kr.rilog.domain.blog.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.service.dto.result.CologProfileResult;

@Schema(description = "팀 프로필 조회 응답")
public record CologProfileResponse(

        @Schema(description = "팀 블로그 ID", example = "1")
        Long id,

        @Schema(description = "팀 블로그 이름", example = "리로그 팀")
        String name,

        @Schema(description = "팀 블로그 slug", example = "rilog-team")
        String slug,

        @Schema(description = "팀 소개", example = "함께 쓰는 기술 블로그")
        String introduction,

        @Schema(description = "팀 로고 이미지 URL", example = "https://example.com/logo.png")
        String logoUrl,

        @Schema(description = "팀 커버 이미지 URL", example = "https://example.com/cover.png")
        String coverImageUrl
) {

    public static CologProfileResponse from(CologProfileResult result) {
        return new CologProfileResponse(
                result.id(),
                result.name(),
                result.slug(),
                result.introduction(),
                result.logoUrl(),
                result.coverImageUrl()
        );
    }
}
