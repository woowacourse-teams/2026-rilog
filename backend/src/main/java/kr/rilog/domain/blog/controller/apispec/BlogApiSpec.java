package kr.rilog.domain.blog.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.global.response.ApiResponse;

import java.util.List;

public interface BlogApiSpec {

    @Operation(description = "나의 블로그 목록 요약 조회 API", summary = "나의 블로그 목록 요약 조회 API")
    ApiResponse<List<MyCologResponse>> getMyCologsPreview(@LoginUserId Long requesterId);

}
