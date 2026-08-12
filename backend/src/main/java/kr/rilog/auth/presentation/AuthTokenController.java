package kr.rilog.auth.presentation;

import jakarta.validation.Valid;
import kr.rilog.auth.application.ExchangeLoginCode;
import kr.rilog.auth.application.Logout;
import kr.rilog.auth.application.RefreshLoginSession;
import kr.rilog.auth.presentation.dto.ExchangeTokenRequest;
import kr.rilog.auth.presentation.dto.ExchangeTokenResponse;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthTokenController {

    private final ExchangeLoginCode exchangeLoginCode;
    private final RefreshLoginSession refreshLoginSession;
    private final Logout logout;
    private final AuthCookieFactory cookieFactory;

    public AuthTokenController(
            ExchangeLoginCode exchangeLoginCode,
            RefreshLoginSession refreshLoginSession,
            Logout logout,
            AuthCookieFactory cookieFactory
    ) {
        this.exchangeLoginCode = exchangeLoginCode;
        this.refreshLoginSession = refreshLoginSession;
        this.logout = logout;
        this.cookieFactory = cookieFactory;
    }

    @PostMapping("/token/exchange")
    public ResponseEntity<ExchangeTokenResponse> exchange(
            @Valid @RequestBody ExchangeTokenRequest request
    ) {
        ExchangeLoginCode.Result result = exchangeLoginCode.exchange(request.code());
        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, bearer(result.accessToken()))
                .header(
                        HttpHeaders.SET_COOKIE,
                        cookieFactory.refresh(
                                result.refreshToken(), result.refreshMaxAge()
                        ).toString()
                )
                .body(new ExchangeTokenResponse(result.onboardingStatus()));
    }

    @PostMapping("/token/refresh")
    public ResponseEntity<Void> refresh(
            @CookieValue(
                    name = AuthCookieFactory.REFRESH_COOKIE,
                    required = false
            ) String refreshToken
    ) {
        RefreshLoginSession.Result result = refreshLoginSession.refresh(
                requireRefreshToken(refreshToken)
        );
        ResponseEntity.HeadersBuilder<?> response = ResponseEntity.noContent()
                .header(HttpHeaders.AUTHORIZATION, bearer(result.accessToken()));
        if (result.refreshToken() != null) {
            response.header(
                    HttpHeaders.SET_COOKIE,
                    cookieFactory.refresh(
                            result.refreshToken(), result.refreshMaxAge()
                    ).toString()
            );
        }
        return response.build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(
                    name = AuthCookieFactory.REFRESH_COOKIE,
                    required = false
            ) String refreshToken
    ) {
        logout.logout(requireRefreshToken(refreshToken));
        return ResponseEntity.noContent()
                .header(
                        HttpHeaders.SET_COOKIE,
                        cookieFactory.clearRefresh().toString()
                )
                .build();
    }

    private String requireRefreshToken(String token) {
        if (token == null || token.isBlank()) {
            throw new AuthException(AuthErrorInformation.INVALID_REFRESH_TOKEN);
        }
        return token;
    }

    private String bearer(String accessToken) {
        return "Bearer " + accessToken;
    }
}
