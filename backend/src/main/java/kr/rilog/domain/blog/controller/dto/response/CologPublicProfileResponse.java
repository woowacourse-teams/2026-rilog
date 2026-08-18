package kr.rilog.domain.blog.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;

@Schema(description = "공개 팀 프로필 조회 응답")
public record CologPublicProfileResponse(

        @Schema(description = "공개 프로필 타입", example = "COLOG")
        String type,

        @Schema(description = "팀 블로그 ID", example = "1")
        Long id,

        @Schema(description = "팀 블로그 이름", example = "리로그 팀")
        String name,

        @Schema(description = "팀 블로그 slug", example = "rilog-team")
        String slug,

        @Schema(description = "팀 소개", example = "함께 쓰는 기술 블로그")
        String introduction,

        @Schema(description = "팀 프로필 이미지 URL", example = "https://example.com/profileImage.png")
        String profileImageUrl,

        @Schema(description = "팀 커버 이미지 URL", example = "https://example.com/coverImage.png")
        String coverImageUrl,

        @Schema(description = "팀 서비스 URL", example = "https://rilog.example.com")
        String serviceUrl,

        @Schema(description = "팀 GitHub URL", example = "https://github.com/rilog")
        String githubUrl,

        @Schema(description = "팀 활성 멤버 수", example = "10")
        long memberCount,

        @Schema(description = "팀 공개 게시글 수", example = "24")
        long postCount
) {

    private static final String TYPE = "COLOG";

    public static CologPublicProfileResponse from(CologPublicProfileResult result) {
        return new CologPublicProfileResponse(
                TYPE,
                result.id(),
                result.name(),
                result.slug(),
                result.introduction(),
                result.profileImageUrl(),
                result.coverImageUrl(),
                result.serviceUrl(),
                result.githubUrl(),
                result.memberCount(),
                result.postCount()
        );
    }
}
