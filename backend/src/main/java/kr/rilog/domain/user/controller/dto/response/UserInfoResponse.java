package kr.rilog.domain.user.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;

@Schema(description = "유저 정보 조회 응답")
public record UserInfoResponse(

        @Schema(description = "사용자 ID", example = "1")
        Long id,

        @Schema(description = "사용자 닉네임", example = "리로")
        String nickname,

        @Schema(description = "사용자 slug", example = "jinriro")
        String slug,

        @Schema(description = "프로필 이미지 URL", example = "https://example.com/profile.png")
        String profileImageUrl
) {

    public static UserInfoResponse from(UserInfoResult result) {
        return new UserInfoResponse(
                result.id(),
                result.nickname(),
                result.slug(),
                result.profileImageUrl()
        );
    }
}
