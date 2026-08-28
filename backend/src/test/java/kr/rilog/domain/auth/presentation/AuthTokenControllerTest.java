package kr.rilog.domain.auth.presentation;

import jakarta.servlet.http.Cookie;
import kr.rilog.domain.auth.application.token.AuthTokenPair;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenLogoutService;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenRotationService;
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
import static org.mockito.Mockito.verifyNoInteractions;
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
        RefreshTokenRotationService refreshTokenRotationService = mock(RefreshTokenRotationService.class);
        when(refreshTokenRotationService.rotate(any(RefreshToken.class)))
                .thenReturn(new AuthTokenPair(
                        AccessToken.of("new-access-token"),
                        RefreshToken.of("new-refresh-token")
                ));
        MockMvc mockMvc = mockMvc(refreshTokenRotationService);

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

        verify(refreshTokenRotationService).rotate(RefreshToken.of("old-refresh-token"));
    }

    @Test
    @DisplayName("Refresh Token 쿠키가 없으면 토큰 재발급을 거부한다")
    void refreshRejectsMissingRefreshTokenCookie() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(mock(RefreshTokenRotationService.class));

        // when - then
        mockMvc.perform(post("/v1/auth/token/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("REFRESH_TOKEN_MISSING"));
    }

    @Test
    @DisplayName("POST /v1/auth/logout은 Refresh Token 세션을 폐기하고 만료 쿠키를 내려준다")
    void logoutRevokesRefreshSessionAndExpiresCookie() throws Exception {
        // given
        RefreshTokenLogoutService refreshTokenLogoutService = mock(RefreshTokenLogoutService.class);
        MockMvc mockMvc = mockMvc(mock(RefreshTokenRotationService.class), refreshTokenLogoutService);

        // when - then
        mockMvc.perform(post("/v1/auth/logout")
                        .cookie(new Cookie("refresh_token", "old-refresh-token")))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("refresh_token="),
                        containsString("Path=/v1/auth"),
                        containsString("Max-Age=0"),
                        containsString("HttpOnly"),
                        containsString("SameSite=Lax")
                )));

        verify(refreshTokenLogoutService).logout(RefreshToken.of("old-refresh-token"));
    }

    @Test
    @DisplayName("POST /v1/auth/logout은 Refresh Token 쿠키가 없어도 만료 쿠키를 내려준다")
    void logoutWithoutRefreshTokenCookieExpiresCookie() throws Exception {
        // given
        RefreshTokenLogoutService refreshTokenLogoutService = mock(RefreshTokenLogoutService.class);
        MockMvc mockMvc = mockMvc(mock(RefreshTokenRotationService.class), refreshTokenLogoutService);

        // when - then
        mockMvc.perform(post("/v1/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("refresh_token="),
                        containsString("Path=/v1/auth"),
                        containsString("Max-Age=0"),
                        containsString("HttpOnly"),
                        containsString("SameSite=Lax")
                )));

        verifyNoInteractions(refreshTokenLogoutService);
    }

    private MockMvc mockMvc(RefreshTokenRotationService refreshTokenRotationService) {
        return mockMvc(refreshTokenRotationService, mock(RefreshTokenLogoutService.class));
    }

    private MockMvc mockMvc(
            RefreshTokenRotationService refreshTokenRotationService,
            RefreshTokenLogoutService refreshTokenLogoutService
    ) {
        RefreshTokenProperties properties = RefreshTokenProperties.of(
                Duration.ofDays(14),
                "refresh_token",
                "/v1/auth",
                false,
                "Lax"
        );
        return MockMvcBuilders.standaloneSetup(new AuthTokenController(
                        refreshTokenRotationService,
                        refreshTokenLogoutService,
                        new RefreshTokenCookieFactory(properties)
                ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }
}
