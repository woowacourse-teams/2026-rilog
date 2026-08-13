package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.oauth.CompleteOAuthLogin;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenService;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenIssuer;
import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.StartOAuthLogin;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.OAUTH_REQUEST_FAILED;

@RestController
public class GithubOAuthController {

    private final StartOAuthLogin startOAuthLogin;
    private final CompleteOAuthLogin completeOAuthLogin;
    private final RefreshTokenIssuer refreshTokenIssuer;
    private final RefreshTokenCookieFactory refreshTokenCookieFactory;
    private final OnboardingTokenService onboardingTokenService;
    private final AccessTokenService accessTokenService;

    public GithubOAuthController(
            StartOAuthLogin startOAuthLogin,
            CompleteOAuthLogin completeOAuthLogin,
            RefreshTokenIssuer refreshTokenIssuer,
            RefreshTokenCookieFactory refreshTokenCookieFactory,
            OnboardingTokenService onboardingTokenService,
            AccessTokenService accessTokenService
    ) {
        this.startOAuthLogin = startOAuthLogin;
        this.completeOAuthLogin = completeOAuthLogin;
        this.refreshTokenIssuer = refreshTokenIssuer;
        this.refreshTokenCookieFactory = refreshTokenCookieFactory;
        this.onboardingTokenService = onboardingTokenService;
        this.accessTokenService = accessTokenService;
    }

    @GetMapping("/v1/auth/github")
    public ResponseEntity<Void> start() {
        URI redirectUri = startOAuthLogin.start(SocialLoginProvider.GITHUB);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirectUri)
                .build();
    }

    @GetMapping("/v1/auth/github/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error
    ) {
        if (StringUtils.hasText(error)) {
            throw new AuthException(OAUTH_REQUEST_FAILED);
        }

        User loginUser = completeOAuthLogin.complete(SocialLoginProvider.GITHUB, code, state);
        if (OnboardingStatus.PENDING == loginUser.getOnboardingStatus()) {
            OnboardingToken onboardingToken = onboardingTokenService.issue(loginUser.getId());
            return ResponseEntity.noContent()
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + onboardingToken.value())
                    .build();
        }

        AccessToken accessToken = accessTokenService.issue(
                loginUser.getId(),
                loginUser.getGlobalRole(),
                loginUser.getSlug()
        );
        RefreshToken refreshToken = refreshTokenIssuer.issue(loginUser);
        ResponseCookie refreshTokenCookie = refreshTokenCookieFactory.create(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken.value())
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
                .build();
    }

}
