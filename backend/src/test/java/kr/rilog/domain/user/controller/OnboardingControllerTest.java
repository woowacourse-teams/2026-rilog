package kr.rilog.domain.user.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenService;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenIssuer;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.auth.presentation.RefreshTokenCookieFactory;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.service.UserService;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.domain.blog.entity.Slug;
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
        OnboardingTokenService onboardingTokenService = mock(OnboardingTokenService.class);
        UserService userService = mock(UserService.class);
        AccessTokenService accessTokenService = mock(AccessTokenService.class);
        RefreshTokenIssuer refreshTokenIssuer = mock(RefreshTokenIssuer.class);

        User user = completedUser();
        when(onboardingTokenService.parse("onboarding-token"))
                .thenReturn(OnboardingTokenClaims.of(
                        1L,
                        Instant.parse("2026-08-13T00:00:00Z"),
                        Instant.parse("2026-08-13T00:10:00Z")
                ));
        when(userService.completeOnboarding(1L, command()))
                .thenReturn(user);
        when(accessTokenService.issue(1L, GlobalRole.USER, "ri_log-01"))
                .thenReturn(AccessToken.of("access-token"));
        when(refreshTokenIssuer.issue(user))
                .thenReturn(RefreshToken.of("refresh-token"));

        MockMvc mockMvc = mockMvc(onboardingTokenService, userService, accessTokenService, refreshTokenIssuer);

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
        OnboardingTokenService onboardingTokenService = mock(OnboardingTokenService.class);
        UserService userService = mock(UserService.class);
        MockMvc mockMvc = mockMvc(
                onboardingTokenService,
                userService,
                mock(AccessTokenService.class),
                mock(RefreshTokenIssuer.class)
        );

        // when - then
        mockMvc.perform(patch("/v1/users/me/onboarding")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTHORIZATION_HEADER_MISSING"));

        verify(onboardingTokenService, never()).parse(any(String.class));
        verify(userService, never()).completeOnboarding(any(Long.class), any(OnboardingCompleteCommand.class));
    }

    @Test
    @DisplayName("Bearer 형식이 아니면 온보딩 완료를 거부한다")
    void completeOnboardingRejectsInvalidAuthorizationHeader() throws Exception {
        // given
        OnboardingTokenService onboardingTokenService = mock(OnboardingTokenService.class);
        UserService userService = mock(UserService.class);
        MockMvc mockMvc = mockMvc(
                onboardingTokenService,
                userService,
                mock(AccessTokenService.class),
                mock(RefreshTokenIssuer.class)
        );

        // when - then
        mockMvc.perform(patch("/v1/users/me/onboarding")
                        .header(HttpHeaders.AUTHORIZATION, "Basic onboarding-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_AUTHORIZATION_HEADER"));

        verify(onboardingTokenService, never()).parse(any(String.class));
        verify(userService, never()).completeOnboarding(any(Long.class), any(OnboardingCompleteCommand.class));
    }

    @Test
    @DisplayName("유효하지 않은 Onboarding Token이면 온보딩 완료를 거부한다")
    void completeOnboardingRejectsInvalidOnboardingToken() throws Exception {
        // given
        OnboardingTokenService onboardingTokenService = mock(OnboardingTokenService.class);
        UserService userService = mock(UserService.class);
        when(onboardingTokenService.parse("invalid-token"))
                .thenThrow(new AuthException(INVALID_ONBOARDING_TOKEN));
        MockMvc mockMvc = mockMvc(
                onboardingTokenService,
                userService,
                mock(AccessTokenService.class),
                mock(RefreshTokenIssuer.class)
        );

        // when - then
        mockMvc.perform(patch("/v1/users/me/onboarding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_ONBOARDING_TOKEN"));

        verify(userService, never()).completeOnboarding(any(Long.class), any(OnboardingCompleteCommand.class));
    }

    private MockMvc mockMvc(
            OnboardingTokenService onboardingTokenService,
            UserService userService,
            AccessTokenService accessTokenService,
            RefreshTokenIssuer refreshTokenIssuer
    ) {
        RefreshTokenProperties properties = RefreshTokenProperties.of(
                Duration.ofDays(14),
                "refresh_token",
                "/v1/auth",
                false,
                "Lax"
        );
        return MockMvcBuilders.standaloneSetup(new OnboardingController(
                        onboardingTokenService,
                        userService,
                        accessTokenService,
                        refreshTokenIssuer,
                        new RefreshTokenCookieFactory(properties)
                ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private User completedUser() {
        return User.builder()
                .id(1L)
                .githubId(100L)
                .nickname(Nickname.from("러로"))
                .slug(Slug.from("ri_log-01"))
                .globalRole(GlobalRole.USER)
                .onboardingStatus(OnboardingStatus.COMPLETED)
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
}
