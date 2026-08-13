package kr.rilog.domain.auth.presentation;

import jakarta.servlet.http.Cookie;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenRotationResult;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenRotator;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Duration;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthTokenControllerTest {

    @Test
    @DisplayName("POST /v1/auth/token/refresh는 Refresh Token 쿠키로 토큰을 재발급한다")
    void refreshIssuesNewAccessTokenAndRefreshTokenCookie() throws Exception {
        // given
        RefreshTokenRotator refreshTokenRotator = mock(RefreshTokenRotator.class);
        when(refreshTokenRotator.rotate(any(RefreshToken.class)))
                .thenReturn(new RefreshTokenRotationResult(
                        AccessToken.of("new-access-token"),
                        RefreshToken.of("new-refresh-token")
                ));
        MockMvc mockMvc = mockMvc(refreshTokenRotator);

        // when - then
        mockMvc.perform(post("/v1/auth/token/refresh")
                        .cookie(new Cookie("refresh_token", "old-refresh-token")))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.AUTHORIZATION, "Bearer new-access-token"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("refresh_token=new-refresh-token"),
                        containsString("Path=/v1/auth"),
                        containsString("Max-Age=1209600"),
                        containsString("HttpOnly"),
                        containsString("SameSite=Lax")
                )));

        verify(refreshTokenRotator).rotate(RefreshToken.of("old-refresh-token"));
    }

    @Test
    @DisplayName("Refresh Token 쿠키가 없으면 토큰 재발급을 거부한다")
    void refreshRejectsMissingRefreshTokenCookie() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(mock(RefreshTokenRotator.class));

        // when - then
        mockMvc.perform(post("/v1/auth/token/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("REFRESH_TOKEN_MISSING"));
    }

    private MockMvc mockMvc(RefreshTokenRotator refreshTokenRotator) {
        RefreshTokenProperties properties = RefreshTokenProperties.of(
                Duration.ofDays(14),
                "refresh_token",
                "/v1/auth",
                false,
                "Lax"
        );
        return MockMvcBuilders.standaloneSetup(new AuthTokenController(
                        refreshTokenRotator,
                        new RefreshTokenCookieFactory(properties),
                        properties
                ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }
}
