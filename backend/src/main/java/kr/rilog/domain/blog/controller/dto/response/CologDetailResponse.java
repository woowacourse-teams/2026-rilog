package kr.rilog.domain.blog.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.service.dto.result.CologDetailResult;

@Schema(description = "팀 상세 조회 응답")
public record CologDetailResponse(

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
        String coverImageUrl,

        @Schema(description = "팀 서비스 URL", example = "https://rilog.example.com")
        String serviceUrl,

        @Schema(description = "팀 GitHub URL", example = "https://github.com/rilog")
        String githubUrl,

        @Schema(description = "팀 생성 사용자 정보")
        UserResponse user
) {

    public static CologDetailResponse from(CologDetailResult result) {
        return new CologDetailResponse(
                result.id(),
                result.name(),
                result.slug(),
                result.introduction(),
                result.logoUrl(),
                result.coverImageUrl(),
                result.serviceUrl(),
                result.githubUrl(),
                UserResponse.from(result.user())
        );
    }

    public record UserResponse(

            @Schema(description = "사용자 ID", example = "1")
            Long id,

            @Schema(description = "사용자 닉네임", example = "리로")
            String nickname,

            @Schema(description = "사용자 slug", example = "jinriro")
            String slug,

            @Schema(description = "사용자 프로필 이미지 URL", example = "https://example.com/profile.png")
            String profileImageUrl
    ) {

        public static UserResponse from(CologDetailResult.UserResult result) {
            return new UserResponse(
                    result.id(),
                    result.nickname(),
                    result.slug(),
                    result.profileImageUrl()
            );
        }
    }
}
