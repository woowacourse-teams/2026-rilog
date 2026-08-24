package kr.rilog.domain.user.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenService;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.auth.presentation.RefreshTokenCookieFactory;
import kr.rilog.domain.user.controller.apispec.OnboardingApiSpec;
import kr.rilog.domain.user.controller.dto.request.OnboardingCompleteRequest;
import kr.rilog.domain.user.service.OnboardingCompletionResult;
import kr.rilog.domain.user.service.OnboardingCompletionService;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.AUTHORIZATION_HEADER_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_AUTHORIZATION_HEADER;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class OnboardingController implements OnboardingApiSpec {

    private static final String BEARER_PREFIX = "Bearer ";

    private final OnboardingTokenService onboardingTokenService;
    private final OnboardingCompletionService onboardingCompletionService;
    private final RefreshTokenCookieFactory refreshTokenCookieFactory;

    @Override
    @PatchMapping("/users/me/onboarding")
    public ResponseEntity<ApiResponse<Void>> complete(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody OnboardingCompleteRequest request
    ) {
        String onboardingToken = extractBearerToken(authorizationHeader);
        OnboardingTokenClaims claims = onboardingTokenService.parse(onboardingToken);
        OnboardingCompletionResult result = onboardingCompletionService.complete(claims.userId(), request.toCommand());
        RefreshToken refreshToken = result.refreshToken();
        ResponseCookie refreshTokenCookie = refreshTokenCookieFactory.create(refreshToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, BEARER_PREFIX + result.accessToken().value())
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
                .body(ApiResponse.response(HttpStatus.OK, "온보딩이 완료되었습니다."));
    }

    private String extractBearerToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader)) {
            throw new AuthException(AUTHORIZATION_HEADER_MISSING);
        }
        if (!authorizationHeader.startsWith(BEARER_PREFIX)) {
            throw new AuthException(INVALID_AUTHORIZATION_HEADER);
        }

        String token = authorizationHeader.substring(BEARER_PREFIX.length());
        if (!StringUtils.hasText(token) || containsWhitespace(token)) {
            throw new AuthException(INVALID_AUTHORIZATION_HEADER);
        }
        return token;
    }

    private boolean containsWhitespace(String value) {
        return value.chars()
                .anyMatch(Character::isWhitespace);
    }
}
