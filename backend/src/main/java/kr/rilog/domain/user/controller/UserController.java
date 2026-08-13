package kr.rilog.domain.user.controller;

import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.user.controller.apispec.UserApiSpec;
import kr.rilog.domain.user.controller.dto.response.UserInfoResponse;
import kr.rilog.domain.user.service.UserQueryService;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class UserController implements UserApiSpec {

    private final UserQueryService userQueryService;

    @GetMapping("/users/{slug}")
    @AuthGuard
    @Override
    public ApiResponse<UserInfoResponse> getUserInfo(@PathVariable("slug") String slug) {
        UserInfoResult result = userQueryService.getUserInfo(slug);
        UserInfoResponse data = UserInfoResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "유저 정보 조회에 성공했습니다.", data);
    }
}
