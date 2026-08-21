package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.oauth.CompleteOAuthLogin;
import kr.rilog.domain.auth.application.oauth.OAuthLoginResult;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenService;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenIssuer;
import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.StartOAuthLogin;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.auth.presentation.dto.request.GithubOAuthCallbackRequest;
import kr.rilog.domain.auth.presentation.dto.response.GithubOAuthCallbackResponse;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import java.net.URI;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.OAUTH_REQUEST_FAILED;

@RestController
@RequiredArgsConstructor
public class GithubOAuthController {

    private final StartOAuthLogin startOAuthLogin;
    private final CompleteOAuthLogin completeOAuthLogin;
    private final RefreshTokenIssuer refreshTokenIssuer;
    private final RefreshTokenCookieFactory refreshTokenCookieFactory;
    private final OnboardingTokenService onboardingTokenService;
    private final AccessTokenService accessTokenService;

    @GetMapping("/v1/auth/github")
    public ResponseEntity<Void> start(@RequestParam(required = false) String redirectUrl) {
        URI redirectUri = startOAuthLogin.start(SocialLoginProvider.GITHUB, redirectUrl);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirectUri)
                .build();
    }

    @PostMapping("/v1/auth/github/callback")
    public ResponseEntity<ApiResponse<GithubOAuthCallbackResponse>> callback(
            @RequestBody GithubOAuthCallbackRequest request
    ) {
        if (StringUtils.hasText(request.error())) {
            throw new AuthException(OAUTH_REQUEST_FAILED);
        }

        OAuthLoginResult result = completeOAuthLogin.complete(SocialLoginProvider.GITHUB, request.code(), request.state());
        User loginUser = result.user();
        GithubOAuthCallbackResponse data = GithubOAuthCallbackResponse.of(
                loginUser.getOnboardingStatus(),
                result.redirectUrl()
        );
        if (OnboardingStatus.PENDING == loginUser.getOnboardingStatus()) {
            OnboardingToken onboardingToken = onboardingTokenService.issue(loginUser.getId());
            return ResponseEntity.ok()
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + onboardingToken.value())
                    .body(ApiResponse.response(HttpStatus.OK, "GitHub 로그인에 성공했습니다.", data));
        }

        AccessToken accessToken = accessTokenService.issue(
                loginUser.getId(),
                loginUser.getGlobalRole(),
                loginUser.getSlug()
        );
        RefreshToken refreshToken = refreshTokenIssuer.issue(loginUser);
        ResponseCookie refreshTokenCookie = refreshTokenCookieFactory.create(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken.value())
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
                .body(ApiResponse.response(HttpStatus.OK, "GitHub 로그인에 성공했습니다.", data));
    }

}
