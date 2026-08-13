package kr.rilog.domain.blog.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.blog.controller.dto.request.CologCreateRequest;
import kr.rilog.domain.blog.controller.dto.response.CologCreateResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "팀 블로그 API")
public interface CologApiSpec {

    @Operation(
            summary = "팀 생성 API",
            description = "팀 블로그를 생성하고 요청자를 OWNER 멤버로 등록합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201",
            description = "팀 블로그 생성 성공"
    )
    ApiResponse<CologCreateResponse> create(
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody CologCreateRequest request
    );
}
