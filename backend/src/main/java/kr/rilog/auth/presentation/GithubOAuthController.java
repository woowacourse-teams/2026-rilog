package kr.rilog.auth.presentation;

import java.net.URI;
import kr.rilog.auth.application.CompleteGithubLogin;
import kr.rilog.auth.application.StartGithubLogin;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/auth/github")
public class GithubOAuthController {

    private final StartGithubLogin startGithubLogin;
    private final CompleteGithubLogin completeGithubLogin;
    private final AuthCookieFactory cookieFactory;
    private final URI frontendCallbackUri;

    public GithubOAuthController(
            StartGithubLogin startGithubLogin,
            CompleteGithubLogin completeGithubLogin,
            AuthCookieFactory cookieFactory,
            URI frontendCallbackUri
    ) {
        this.startGithubLogin = startGithubLogin;
        this.completeGithubLogin = completeGithubLogin;
        this.cookieFactory = cookieFactory;
        this.frontendCallbackUri = frontendCallbackUri;
    }

    @GetMapping("/login")
    public ResponseEntity<Void> login() {
        StartGithubLogin.Result result = startGithubLogin.start();
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(result.authorizationUri())
                .header(
                        HttpHeaders.SET_COOKIE,
                        cookieFactory.oauthBinding(result.browserBinding()).toString()
                )
                .build();
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam String code,
            @RequestParam String state,
            @CookieValue(
                    name = AuthCookieFactory.OAUTH_BINDING_COOKIE,
                    required = false
            ) String browserBinding
    ) {
        CompleteGithubLogin.Result result = completeGithubLogin.complete(
                code, state, browserBinding
        );
        URI redirect = UriComponentsBuilder.fromUri(frontendCallbackUri)
                .queryParam("code", result.exchangeCode())
                .encode()
                .build()
                .toUri();
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirect)
                .header(
                        HttpHeaders.SET_COOKIE,
                        cookieFactory.clearOAuthBinding().toString()
                )
                .build();
    }
}
