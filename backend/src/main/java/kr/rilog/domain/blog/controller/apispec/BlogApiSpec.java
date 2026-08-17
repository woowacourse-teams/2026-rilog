package kr.rilog.domain.blog.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.dto.response.CologPublicProfileResponse;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

public interface BlogApiSpec {

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
