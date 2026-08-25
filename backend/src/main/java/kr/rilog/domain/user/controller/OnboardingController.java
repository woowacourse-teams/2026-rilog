package kr.rilog.domain.user.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.application.token.AuthTokenPair;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.presentation.RefreshTokenCookieFactory;
import kr.rilog.domain.user.controller.apispec.OnboardingApiSpec;
import kr.rilog.domain.user.controller.dto.request.OnboardingCompleteRequest;
import kr.rilog.domain.user.service.OnboardingCompletionService;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static kr.rilog.domain.auth.application.token.TokenType.ONBOARDING;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class OnboardingController implements OnboardingApiSpec {

    private static final String BEARER_PREFIX = "Bearer ";

    private final OnboardingCompletionService onboardingCompletionService;
    private final RefreshTokenCookieFactory refreshTokenCookieFactory;

    @Override
    @AuthGuard(ONBOARDING)
    @PatchMapping("/users/me/onboarding")
    public ResponseEntity<ApiResponse<Void>> complete(
            @LoginUserId Long userId,
            @Valid @RequestBody OnboardingCompleteRequest request
    ) {
        AuthTokenPair result = onboardingCompletionService.complete(userId, request.toCommand());
        RefreshToken refreshToken = result.refreshToken();
        ResponseCookie refreshTokenCookie = refreshTokenCookieFactory.create(refreshToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, BEARER_PREFIX + result.accessToken().value())
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
                .body(ApiResponse.response(HttpStatus.OK, "온보딩이 완료되었습니다."));
    }

}
