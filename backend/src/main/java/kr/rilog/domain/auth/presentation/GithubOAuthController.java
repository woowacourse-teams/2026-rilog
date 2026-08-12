package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.CompleteOAuthLogin;
import kr.rilog.domain.auth.application.SocialLoginProvider;
import kr.rilog.domain.auth.application.StartOAuthLogin;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.http.HttpStatus;
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

    public GithubOAuthController(StartOAuthLogin startOAuthLogin, CompleteOAuthLogin completeOAuthLogin) {
        this.startOAuthLogin = startOAuthLogin;
        this.completeOAuthLogin = completeOAuthLogin;
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

        completeOAuthLogin.complete(SocialLoginProvider.GITHUB, code, state);
        return ResponseEntity.noContent().build();
    }

}
