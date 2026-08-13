package kr.rilog.domain.user.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.rilog.domain.user.controller.dto.response.UserInfoResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;

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
}
