package kr.rilog.domain.user.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.presentation.RefreshTokenCookieFactory;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.user.service.OnboardingCompletionResult;
import kr.rilog.domain.user.service.OnboardingCompletionService;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Duration;
import java.time.Instant;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_ONBOARDING_TOKEN;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OnboardingControllerTest {

    private static final String REQUEST_BODY = """
            {
              "nickname": "러로",
              "slug": "ri_log-01",
              "introduction": "기록하는 개발자입니다.",
              "profileImageUrl": "https://example.com/profile.png",
              "githubUrl": "https://github.com/jinriro",
              "email": "riro@example.com"
            }
            """;

    @Test
    @DisplayName("PATCH /v1/users/me/onboarding은 온보딩 완료 후 Access Token과 Refresh Token을 발급한다")
    void completeOnboardingIssuesAccessTokenAndRefreshToken() throws Exception {
        // given
        OnboardingCompletionService onboardingCompletionService = mock(OnboardingCompletionService.class);
        when(onboardingCompletionService.complete(1L, command()))
                .thenReturn(new OnboardingCompletionResult(
                        AccessToken.of("access-token"),
                        RefreshToken.of("refresh-token")
                ));

        MockMvc mockMvc = mockMvc(onboardingCompletionService);

        // when - then
        mockMvc.perform(patch("/v1/users/me/onboarding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer onboarding-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("온보딩이 완료되었습니다."))
                .andExpect(header().string(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("refresh_token=refresh-token"),
                        containsString("Path=/v1/auth"),
                        containsString("Max-Age=1209600"),
                        containsString("HttpOnly"),
                        containsString("SameSite=Lax")
                )));
    }

    @Test
    @DisplayName("Authorization 헤더가 없으면 온보딩 완료를 거부한다")
    void completeOnboardingRejectsMissingAuthorizationHeader() throws Exception {
        // given
        OnboardingCompletionService onboardingCompletionService = mock(OnboardingCompletionService.class);
        MockMvc mockMvc = mockMvc(onboardingCompletionService);

        // when - then
        mockMvc.perform(patch("/v1/users/me/onboarding")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTHORIZATION_HEADER_MISSING"));

        verify(onboardingCompletionService, never()).complete(any(Long.class), any(OnboardingCompleteCommand.class));
    }

    @Test
    @DisplayName("Bearer 형식이 아니면 온보딩 완료를 거부한다")
    void completeOnboardingRejectsInvalidAuthorizationHeader() throws Exception {
        // given
        OnboardingCompletionService onboardingCompletionService = mock(OnboardingCompletionService.class);
        MockMvc mockMvc = mockMvc(onboardingCompletionService);

        // when - then
        mockMvc.perform(patch("/v1/users/me/onboarding")
                        .header(HttpHeaders.AUTHORIZATION, "Basic onboarding-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_AUTHORIZATION_HEADER"));

        verify(onboardingCompletionService, never()).complete(any(Long.class), any(OnboardingCompleteCommand.class));
    }

    @Test
    @DisplayName("유효하지 않은 Onboarding Token이면 온보딩 완료를 거부한다")
    void completeOnboardingRejectsInvalidOnboardingToken() throws Exception {
        // given
        OnboardingCompletionService onboardingCompletionService = mock(OnboardingCompletionService.class);
        MockMvc mockMvc = mockMvc(
                onboardingCompletionService,
                new ThrowingOnboardingTokenProvider()
        );

        // when - then
        mockMvc.perform(patch("/v1/users/me/onboarding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_ONBOARDING_TOKEN"));

        verify(onboardingCompletionService, never()).complete(any(Long.class), any(OnboardingCompleteCommand.class));
    }

    private MockMvc mockMvc(OnboardingCompletionService onboardingCompletionService) {
        return mockMvc(onboardingCompletionService, new FixedOnboardingTokenProvider());
    }

    private MockMvc mockMvc(
            OnboardingCompletionService onboardingCompletionService,
            OnboardingTokenProvider onboardingTokenProvider
    ) {
        RefreshTokenProperties properties = RefreshTokenProperties.of(
                Duration.ofDays(14),
                "refresh_token",
                "/v1/auth",
                false,
                "Lax"
        );
        return MockMvcBuilders.standaloneSetup(new OnboardingController(
                        onboardingCompletionService,
                        new RefreshTokenCookieFactory(properties)
                ))
                .addInterceptors(new BearerAuthenticationInterceptor(
                        new ThrowingAccessTokenProvider(),
                        onboardingTokenProvider
                ))
                .setCustomArgumentResolvers(new LoginUserIdArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private OnboardingCompleteCommand command() {
        return new OnboardingCompleteCommand(
                "러로",
                "ri_log-01",
                "기록하는 개발자입니다.",
                "https://example.com/profile.png",
                "https://github.com/jinriro",
                "riro@example.com"
        );
    }

    private static class FixedOnboardingTokenProvider implements OnboardingTokenProvider {

        @Override
        public OnboardingToken issue(Long userId) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public OnboardingTokenClaims parse(String onboardingToken) {
            return OnboardingTokenClaims.of(
                    1L,
                    Instant.parse("2026-08-13T00:00:00Z"),
                    Instant.parse("2026-08-13T00:10:00Z")
            );
        }
    }

    private static class ThrowingOnboardingTokenProvider implements OnboardingTokenProvider {

        @Override
        public OnboardingToken issue(Long userId) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public OnboardingTokenClaims parse(String onboardingToken) {
            throw new AuthException(INVALID_ONBOARDING_TOKEN);
        }
    }

    private static class ThrowingAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            throw new UnsupportedOperationException("Not used in this test");
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            throw new UnsupportedOperationException("Not used in this test");
        }
    }
}
