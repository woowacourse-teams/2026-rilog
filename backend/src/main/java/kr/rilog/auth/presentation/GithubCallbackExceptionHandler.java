package kr.rilog.auth.presentation;

import java.net.URI;
import java.util.UUID;
import kr.rilog.global.exception.AuthException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = GithubOAuthController.class)
public class GithubCallbackExceptionHandler {

    private final AuthCookieFactory cookieFactory;
    private final URI frontendCallbackUri;

    public GithubCallbackExceptionHandler(
            AuthCookieFactory cookieFactory,
            URI frontendCallbackUri
    ) {
        this.cookieFactory = cookieFactory;
        this.frontendCallbackUri = frontendCallbackUri;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Void> handleCallbackFailure(Exception exception) {
        String traceId = UUID.randomUUID().toString();
        String failureReason = exception instanceof AuthException authException
                ? authException.getFailureReason().name()
                : exception.getClass().getSimpleName();
        log.warn(
                "[{}] GitHub OAuth callback failed: reason={}",
                traceId,
                failureReason
        );
        URI redirect = UriComponentsBuilder.fromUri(frontendCallbackUri)
                .queryParam("error", "OAUTH_FAILED")
                .queryParam("traceId", traceId)
                .encode()
                .build()
                .toUri();
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirect)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header("Referrer-Policy", "no-referrer")
                .header(
                        HttpHeaders.SET_COOKIE,
                        cookieFactory.clearOAuthBinding().toString()
                )
                .build();
    }
}
