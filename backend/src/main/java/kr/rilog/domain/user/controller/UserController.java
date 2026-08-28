package kr.rilog.domain.user.controller;

import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.user.service.UserService;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.user.controller.apispec.UserApiSpec;
import kr.rilog.domain.user.controller.dto.response.UserInfoResponse;
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

    private final UserService userService;

    @AuthGuard
    @GetMapping("/users/{slug}")
    public ApiResponse<UserInfoResponse> getUserInfo(@PathVariable("slug") String slug) {
        UserInfoResult result = userService.getUserInfo(slug);
        UserInfoResponse data = UserInfoResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "유저 정보 조회에 성공했습니다.", data);
    }

    @AuthGuard
    @GetMapping("/users/me")
    public ApiResponse<UserInfoResponse> getMyUserInfo(@LoginUserId Long userId) {
        UserInfoResult result = userService.getUserInformation(userId);
        UserInfoResponse data = UserInfoResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "나의 유저 정보 조회에 성공했습니다.", data);
    }

}
