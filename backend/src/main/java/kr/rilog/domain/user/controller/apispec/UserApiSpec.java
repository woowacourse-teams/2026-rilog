package kr.rilog.domain.user.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.user.controller.dto.response.UserInfoResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "유저 API")
public interface UserApiSpec {

    @Operation(
            summary = "유저 정보 조회 API",
            description = "멤버 초대에 사용할 온보딩 완료 유저 정보를 slug로 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "유저 정보 조회 성공"
    )
    ApiResponse<UserInfoResponse> getUserInfo(
            @Parameter(description = "사용자 slug", example = "jinriro")
            @PathVariable("slug") String slug
    );

    @Operation(
            summary = "토큰기반 유저 정보 조회 API",
            description = "토큰기반 유저 정보 조회 API입니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "유저 정보 조회 성공"
    )
    ApiResponse<UserInfoResponse> getMyUserInfo(@LoginUserId Long userId);

    @Operation(
            summary = "닉네임 중복 검사 API",
            description = "이미 존재하는 닉네임인지 검사합니다."
    )
    ApiResponse<Void> validateNickname(
            @RequestParam("nickname")
            @Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하이어야 합니다.") String nickname
    );

}
