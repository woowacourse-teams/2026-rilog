package kr.rilog.domain.user.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.user.controller.dto.request.OnboardingCompleteRequest;
import kr.rilog.global.response.ApiResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@Tag(name = "온보딩 API")
public interface OnboardingApiSpec {

    @Operation(
            summary = "온보딩 완료 API",
            description = "Onboarding Token으로 사용자 정보를 설정하고 정식 Access Token과 Refresh Token을 발급합니다."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "온보딩 완료 성공"
    )
    ResponseEntity<ApiResponse<Void>> complete(
            @Parameter(description = "Bearer Onboarding Token", example = "Bearer eyJhbGciOiJIUzI1NiJ9...")
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody OnboardingCompleteRequest request
    );
}
