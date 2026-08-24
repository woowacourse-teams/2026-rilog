package kr.rilog.domain.blog.controller;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.apispec.BlogApiSpec;
import kr.rilog.domain.blog.controller.dto.response.CologPublicProfileResponse;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.service.BlogService;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("v1")
@RequiredArgsConstructor
public class BlogController implements BlogApiSpec {

    private final BlogService blogService;

    @GetMapping("/availability/slug")
    public ApiResponse<Void> validateSlug(
            @RequestParam("slug")
            @Size(min = 4, max = 20, message = "슬러그는 4자 이상 20자 이하이어야 합니다.")
            @Pattern(
                    regexp = "^[A-Za-z0-9_-]+$",
                    message = "슬러그는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있습니다."
            ) String slug
    ) {
        blogService.validateDuplicatedSlug(slug);
        return ApiResponse.response(HttpStatus.OK, "사용가능한 슬러그입니다.");
    }

    @GetMapping("/availability/nickname")
    public ApiResponse<Void> validateNickname(
            @RequestParam("nickname")
            @Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하이어야 합니다.") String nickname
    ) {
        blogService.validateDuplicatedProfileName(nickname);
        return ApiResponse.response(HttpStatus.OK, "사용가능한 닉네임입니다.");
    }

    @GetMapping("/blogs/@{slug}")
    public ApiResponse<CologPublicProfileResponse> getPublicProfile(@PathVariable("slug") String slug) {
        CologPublicProfileResult result = blogService.getPublicProfile(slug);
        CologPublicProfileResponse data = CologPublicProfileResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "공개 프로필 조회에 성공했습니다.", data);
    }

    @AuthGuard
    @GetMapping("/users/me/cologs/preview")
    public ApiResponse<List<MyCologResponse>> getMyCologsPreview(@LoginUserId Long requesterId) {
        List<MyCologResponse> data = blogService.getMyCologsPreview(requesterId);
        return ApiResponse.response(HttpStatus.OK, "나의 팀 목록을 조회합니다.", data);
    }

}
