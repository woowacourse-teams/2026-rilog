package kr.rilog.domain.user.controller;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.user.service.UserService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class UserController implements UserApiSpec {

    private final UserService userService;
    private final UserQueryService userQueryService;

    @GetMapping("/users/{slug}")
    @AuthGuard
    public ApiResponse<UserInfoResponse> getUserInfo(@PathVariable("slug") String slug) {
        UserInfoResult result = userQueryService.getUserInfo(slug);
        UserInfoResponse data = UserInfoResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "유저 정보 조회에 성공했습니다.", data);
    }

    @GetMapping("/availability/nickname")
    public ApiResponse<Void> validateNickname(
            @RequestParam("nickname")
            @Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하이어야 합니다.") String nickname
    ) {
        userService.validateDuplicatedNickname(nickname);
        return ApiResponse.response(HttpStatus.OK, "사용가능한 닉네임입니다.");
    }

    @GetMapping("/availability/slug")
    public ApiResponse<Void> validateSlug(
            @RequestParam("slug")
            @Size(min = 4, max = 20, message = "슬러그는 4자 이상 20자 이하이어야 합니다.")
            @Pattern(
                    regexp = "^[A-Za-z0-9_-]+$",
                    message = "슬러그는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있습니다."
            ) String slug
    ) {
        userService.validateDuplicatedSlug(slug);
        return ApiResponse.response(HttpStatus.OK, "사용가능한 슬러그입니다.");
    }

}
