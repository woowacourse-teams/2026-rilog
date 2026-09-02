package kr.rilog.domain.blog.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.dto.request.BlogProfileUpdateRequest;
import kr.rilog.domain.blog.controller.dto.response.BlogIndexResponse;
import kr.rilog.domain.blog.controller.dto.response.BlogPublicProfileResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

public interface BlogApiSpec {

    @Operation(
            summary = "슬러그 중복 검사 API",
            description = "이미 존재하는 블로그 슬러그인지 검사합니다. 슬러그는 4~20자의 영문, 숫자, 하이픈(-), 언더스코어(_)를 허용하며 소문자로 저장됩니다."
    )
    ApiResponse<Void> validateSlug(
            @Parameter(description = "중복 검사할 블로그 slug", example = "ri_log-01")
            @RequestParam("slug")
            @Size(min = 4, max = 20, message = "슬러그는 4자 이상 20자 이하이어야 합니다.")
            @Pattern(
                    regexp = "^[A-Za-z0-9_-]+$",
                    message = "슬러그는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있습니다."
            ) String slug
    );

    @Operation(
            summary = "닉네임 중복 검사 API",
            description = "개인/팀 블로그 프로필 이름으로 이미 존재하는 닉네임인지 검사합니다."
    )
    ApiResponse<Void> validateNickname(
            @RequestParam("nickname")
            @Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하이어야 합니다.") String nickname
    );

    @Operation(
            summary = "공개 블로그 프로필 조회 API",
            description = "공개 프로필 화면에서 사용할 블로그 정보를 @slug 경로 기준으로 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "공개 블로그 프로필 조회 성공"
    )
    ApiResponse<BlogPublicProfileResponse> getPublicProfile(
            @Parameter(description = "공개 블로그 slug", example = "rilog-team")
            @PathVariable("slug") String slug
    );

    @Operation(
            summary = "프로필 수정 API",
            description = "블로그 프로필을 수정합니다. 개인 블로그는 소유자만, 팀 블로그는 OWNER 또는 ADMIN 권한의 팀 멤버만 수정할 수 있습니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "프로필 수정 성공"
    )
    ApiResponse<Void> updateBlogProfile(
            @LoginUserId Long requesterId,
            @PathVariable("slug") String slug,
            @Valid @RequestBody BlogProfileUpdateRequest dto
    );

    @Operation(
            summary = "Slug기반 블로그 인덱스 조회 API",
            description = "Slug를 사용해 블로그의 인덱스를 조회합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "블로그 인덱스 조회 성공"
    )
    ApiResponse<BlogIndexResponse> getBlogIndex(
            @PathVariable("slug") String slug
    );

}
