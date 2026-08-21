package kr.rilog.domain.blog.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.dto.response.CologPublicProfileResponse;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

public interface BlogApiSpec {

    @Operation(
            summary = "슬러그 중복 검사 API",
            description = "이미 존재하는 블로그 슬러그인지 검사합니다."
    )
    ApiResponse<Void> validateSlug(
            @RequestParam("slug")
            @Size(min = 4, max = 20, message = "슬러그는 4자 이상 20자 이하이어야 합니다.")
            @Pattern(
                    regexp = "^[A-Za-z0-9_-]+$",
                    message = "슬러그는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있습니다."
            ) String slug
    );

    @Operation(
            summary = "공개 블로그 프로필 조회 API",
            description = "공개 프로필 화면에서 사용할 블로그 정보를 @slug 경로 기준으로 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "공개 블로그 프로필 조회 성공"
    )
    ApiResponse<CologPublicProfileResponse> getPublicProfile(
            @Parameter(description = "공개 블로그 slug", example = "rilog-team")
            @PathVariable("slug") String slug
    );

    @Operation(description = "나의 블로그 목록 요약 조회 API", summary = "나의 블로그 목록 요약 조회 API")
    ApiResponse<List<MyCologResponse>> getMyCologsPreview(@LoginUserId Long requesterId);

}
