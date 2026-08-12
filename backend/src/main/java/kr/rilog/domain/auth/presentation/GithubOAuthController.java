package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.CompleteGithubLogin;
import kr.rilog.domain.auth.application.StartGithubLogin;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.GITHUB_OAUTH_REQUEST_FAILED;

@RestController
public class GithubOAuthController {

    private final StartGithubLogin startGithubLogin;
    private final CompleteGithubLogin completeGithubLogin;

    public GithubOAuthController(StartGithubLogin startGithubLogin, CompleteGithubLogin completeGithubLogin) {
        this.startGithubLogin = startGithubLogin;
        this.completeGithubLogin = completeGithubLogin;
    }

    @GetMapping("/v1/auth/github")
    public ResponseEntity<Void> start() {
        URI redirectUri = startGithubLogin.start();
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
            throw new AuthException(GITHUB_OAUTH_REQUEST_FAILED);
        }

        completeGithubLogin.complete(code, state);
        return ResponseEntity.noContent().build();
    }

}
