package kr.rilog.auth.presentation;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.HttpHeaders.CACHE_CONTROL;
import static org.springframework.http.HttpHeaders.LOCATION;
import static org.springframework.http.HttpHeaders.SET_COOKIE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.time.Duration;
import kr.rilog.auth.application.CompleteGithubLogin;
import kr.rilog.auth.application.ExchangeLoginCode;
import kr.rilog.auth.application.Logout;
import kr.rilog.auth.application.RefreshLoginSession;
import kr.rilog.auth.application.StartGithubLogin;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AuthControllerMvcTest {

    private static final String FRONTEND_ORIGIN = "https://rilog.test";
    private static final URI FRONTEND_CALLBACK = URI.create(
            "https://rilog.test/auth/callback"
    );

    private StartGithubLogin startGithubLogin;
    private CompleteGithubLogin completeGithubLogin;
    private ExchangeLoginCode exchangeLoginCode;
    private RefreshLoginSession refreshLoginSession;
    private Logout logout;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        startGithubLogin = mock(StartGithubLogin.class);
        completeGithubLogin = mock(CompleteGithubLogin.class);
        exchangeLoginCode = mock(ExchangeLoginCode.class);
        refreshLoginSession = mock(RefreshLoginSession.class);
        logout = mock(Logout.class);
        AuthCookieFactory cookies = new AuthCookieFactory(
                true, "Lax", Duration.ofMinutes(10)
        );
        GithubOAuthController githubController = new GithubOAuthController(
                startGithubLogin, completeGithubLogin, cookies, FRONTEND_CALLBACK
        );
        AuthTokenController tokenController = new AuthTokenController(
                exchangeLoginCode, refreshLoginSession, logout, cookies
        );
        mockMvc = MockMvcBuilders.standaloneSetup(githubController, tokenController)
                .setControllerAdvice(
                        new GlobalExceptionHandler(),
                        new GithubCallbackExceptionHandler(cookies, FRONTEND_CALLBACK)
                )
                .addInterceptors(new AuthOriginInterceptor(FRONTEND_ORIGIN))
                .build();
    }

    @Test
    @DisplayName("GitHub 로그인 요청은 브라우저 바인딩 쿠키를 발급하고 인가 페이지로 이동한다.")
    void loginRedirectSetsShortLivedBrowserBindingCookie() throws Exception {
        // given
        when(startGithubLogin.start()).thenReturn(new StartGithubLogin.Result(
                URI.create("https://github.test/oauth/authorize?state=state"),
                "binding-secret"
        ));

        // when
        ResultActions result = mockMvc.perform(get("/api/auth/github/login"));

        // then
        result
                .andExpect(status().isFound())
                .andExpect(header().string(
                        LOCATION,
                        "https://github.test/oauth/authorize?state=state"
                ))
                .andExpect(header().string(SET_COOKIE, containsString(
                        "__Secure-rilog-oauth-binding=binding-secret"
                )))
                .andExpect(header().string(SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(SET_COOKIE, containsString("Secure")))
                .andExpect(header().string(
                        SET_COOKIE, containsString("Path=/api/auth/github")
                ));
    }

    @Test
    @DisplayName("GitHub 콜백은 일회용 교환 코드를 전달하고 바인딩 쿠키를 제거한다.")
    void callbackRedirectsWithOneTimeCodeAndClearsBindingCookie() throws Exception {
        // given
        when(completeGithubLogin.complete("github-code", "state", "binding-secret"))
                .thenReturn(new CompleteGithubLogin.Result("exchange-id.secret"));

        // when
        ResultActions result = mockMvc.perform(get("/api/auth/github/callback")
                        .queryParam("code", "github-code")
                        .queryParam("state", "state")
                        .cookie(new MockCookie(
                                AuthCookieFactory.OAUTH_BINDING_COOKIE,
                                "binding-secret"
                        )));

        // then
        result
                .andExpect(status().isFound())
                .andExpect(header().string(
                        LOCATION,
                        "https://rilog.test/auth/callback?code=exchange-id.secret"
                ))
                .andExpect(header().string(CACHE_CONTROL, containsString("no-store")))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().string(SET_COOKIE, containsString("Max-Age=0")));
    }

    @Test
    @DisplayName("GitHub 콜백 실패는 일반 오류와 추적 식별자만 프론트엔드에 전달한다.")
    void callbackFailureUsesGenericFrontendErrorAndTraceId() throws Exception {
        // given
        when(completeGithubLogin.complete(anyString(), anyString(), anyString()))
                .thenThrow(new AuthException(AuthErrorInformation.INVALID_OAUTH_REQUEST));

        // when
        ResultActions result = mockMvc.perform(get("/api/auth/github/callback")
                        .queryParam("code", "github-code")
                        .queryParam("state", "state")
                        .cookie(new MockCookie(
                                AuthCookieFactory.OAUTH_BINDING_COOKIE,
                                "binding-secret"
                        )));

        // then
        result
                .andExpect(status().isFound())
                .andExpect(header().string(
                        LOCATION,
                        containsString("error=OAUTH_FAILED&traceId=")
                ));
    }

    @Test
    @DisplayName("GitHub 접근 거부는 다른 콜백 실패와 동일한 일반 오류를 반환한다.")
    void githubAccessDenialUsesTheSameGenericFrontendError() throws Exception {
        // given
        MockCookie bindingCookie = new MockCookie(
                AuthCookieFactory.OAUTH_BINDING_COOKIE,
                "binding-secret"
        );

        // when
        ResultActions result = mockMvc.perform(get("/api/auth/github/callback")
                        .queryParam("error", "access_denied")
                        .queryParam("state", "state")
                        .cookie(bindingCookie));

        // then
        result
                .andExpect(status().isFound())
                .andExpect(header().string(
                        LOCATION,
                        containsString("error=OAUTH_FAILED&traceId=")
                ));
    }

    @Test
    @DisplayName("교환 코드는 액세스 토큰 헤더와 리프레시 쿠키 및 온보딩 상태로 교환된다.")
    void exchangeReturnsAccessHeaderRefreshCookieAndOnboardingStatus() throws Exception {
        // given
        when(exchangeLoginCode.exchange("exchange-id.secret"))
                .thenReturn(new ExchangeLoginCode.Result(
                        "access-token",
                        "refresh-id.secret",
                        Duration.ofDays(30),
                        OnboardingStatus.PENDING
                ));

        // when
        ResultActions result = mockMvc.perform(post("/api/auth/token/exchange")
                        .header("Origin", FRONTEND_ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"exchange-id.secret\"}"));

        // then
        result
                .andExpect(status().isOk())
                .andExpect(header().string(AUTHORIZATION, "Bearer access-token"))
                .andExpect(header().string(SET_COOKIE, containsString(
                        "__Secure-rilog-refresh=refresh-id.secret"
                )))
                .andExpect(header().string(SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(SET_COOKIE, containsString("Path=/api/auth")))
                .andExpect(header().string(CACHE_CONTROL, containsString("no-store")))
                .andExpect(jsonPath("$.onboardingStatus").value("PENDING"));
    }

    @Test
    @DisplayName("리프레시 토큰을 회전하되 유예 요청은 새 쿠키를 덮어쓰지 않는다.")
    void refreshRotatesCookieButGraceResponseDoesNotOverwriteIt() throws Exception {
        // given
        when(refreshLoginSession.refresh("old-id.secret"))
                .thenReturn(new RefreshLoginSession.Result(
                        "access-token",
                        "new-id.secret",
                        Duration.ofDays(20)
                ));
        when(refreshLoginSession.refresh("grace-id.secret"))
                .thenReturn(new RefreshLoginSession.Result(
                        "grace-access-token", null, null
                ));

        // when
        ResultActions rotatedResult = mockMvc.perform(post("/api/auth/token/refresh")
                        .header("Origin", FRONTEND_ORIGIN)
                        .cookie(new MockCookie(
                                AuthCookieFactory.REFRESH_COOKIE,
                                "old-id.secret"
                        )));
        ResultActions graceResult = mockMvc.perform(post("/api/auth/token/refresh")
                .header("Origin", FRONTEND_ORIGIN)
                .cookie(new MockCookie(
                        AuthCookieFactory.REFRESH_COOKIE,
                        "grace-id.secret"
                )));

        // then
        rotatedResult
                .andExpect(status().isNoContent())
                .andExpect(header().string(AUTHORIZATION, "Bearer access-token"))
                .andExpect(header().string(SET_COOKIE, containsString("new-id.secret")));

        graceResult
                .andExpect(status().isNoContent())
                .andExpect(header().string(AUTHORIZATION, "Bearer grace-access-token"))
                .andExpect(header().doesNotExist(SET_COOKIE));
    }

    @Test
    @DisplayName("토큰 변경 요청은 Origin이 없거나 신뢰할 수 없으면 거부한다.")
    void tokenMutationsRejectMissingOrUntrustedOrigin() throws Exception {
        // given
        String untrustedOrigin = "https://evil.test";

        // when
        ResultActions missingOriginResult = mockMvc.perform(
                post("/api/auth/token/refresh")
        );
        ResultActions untrustedOriginResult = mockMvc.perform(
                post("/api/auth/token/refresh").header("Origin", untrustedOrigin)
        );

        // then
        missingOriginResult
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").doesNotExist());

        untrustedOriginResult
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").doesNotExist());
    }

    @Test
    @DisplayName("로그아웃은 리프레시 세션을 폐기하고 쿠키를 제거한다.")
    void logoutRevokesSessionAndClearsCookie() throws Exception {
        // given
        doNothing().when(logout).logout("refresh-id.secret");

        // when
        ResultActions result = mockMvc.perform(post("/api/auth/logout")
                        .header("Origin", FRONTEND_ORIGIN)
                        .cookie(new MockCookie(
                                AuthCookieFactory.REFRESH_COOKIE,
                                "refresh-id.secret"
                        )));

        // then
        result
                .andExpect(status().isNoContent())
                .andExpect(header().string(SET_COOKIE, containsString("Max-Age=0")));
    }

}
