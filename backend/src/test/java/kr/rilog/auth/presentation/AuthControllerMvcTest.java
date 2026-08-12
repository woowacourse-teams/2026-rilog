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
import kr.rilog.domain.OnboardingStatus;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.web.servlet.MockMvc;
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
    void loginRedirectSetsShortLivedBrowserBindingCookie() throws Exception {
        when(startGithubLogin.start()).thenReturn(new StartGithubLogin.Result(
                URI.create("https://github.test/oauth/authorize?state=state"),
                "binding-secret"
        ));

        mockMvc.perform(get("/api/auth/github/login"))
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
    void callbackRedirectsWithOneTimeCodeAndClearsBindingCookie() throws Exception {
        when(completeGithubLogin.complete("github-code", "state", "binding-secret"))
                .thenReturn(new CompleteGithubLogin.Result("exchange-id.secret"));

        mockMvc.perform(get("/api/auth/github/callback")
                        .queryParam("code", "github-code")
                        .queryParam("state", "state")
                        .cookie(new MockCookie(
                                AuthCookieFactory.OAUTH_BINDING_COOKIE,
                                "binding-secret"
                        )))
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
    void callbackFailureUsesGenericFrontendErrorAndTraceId() throws Exception {
        when(completeGithubLogin.complete(anyString(), anyString(), anyString()))
                .thenThrow(new AuthException(AuthErrorInformation.INVALID_OAUTH_REQUEST));

        mockMvc.perform(get("/api/auth/github/callback")
                        .queryParam("code", "github-code")
                        .queryParam("state", "state")
                        .cookie(new MockCookie(
                                AuthCookieFactory.OAUTH_BINDING_COOKIE,
                                "binding-secret"
                        )))
                .andExpect(status().isFound())
                .andExpect(header().string(
                        LOCATION,
                        containsString("error=OAUTH_FAILED&traceId=")
                ));
    }

    @Test
    void githubAccessDenialUsesTheSameGenericFrontendError() throws Exception {
        mockMvc.perform(get("/api/auth/github/callback")
                        .queryParam("error", "access_denied")
                        .queryParam("state", "state")
                        .cookie(new MockCookie(
                                AuthCookieFactory.OAUTH_BINDING_COOKIE,
                                "binding-secret"
                        )))
                .andExpect(status().isFound())
                .andExpect(header().string(
                        LOCATION,
                        containsString("error=OAUTH_FAILED&traceId=")
                ));
    }

    @Test
    void exchangeReturnsAccessHeaderRefreshCookieAndOnboardingStatus() throws Exception {
        when(exchangeLoginCode.exchange("exchange-id.secret"))
                .thenReturn(new ExchangeLoginCode.Result(
                        "access-token",
                        "refresh-id.secret",
                        Duration.ofDays(30),
                        OnboardingStatus.PENDING
                ));

        mockMvc.perform(post("/api/auth/token/exchange")
                        .header("Origin", FRONTEND_ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"exchange-id.secret\"}"))
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
    void refreshRotatesCookieButGraceResponseDoesNotOverwriteIt() throws Exception {
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

        mockMvc.perform(post("/api/auth/token/refresh")
                        .header("Origin", FRONTEND_ORIGIN)
                        .cookie(new MockCookie(
                                AuthCookieFactory.REFRESH_COOKIE,
                                "old-id.secret"
                        )))
                .andExpect(status().isNoContent())
                .andExpect(header().string(AUTHORIZATION, "Bearer access-token"))
                .andExpect(header().string(SET_COOKIE, containsString("new-id.secret")));

        mockMvc.perform(post("/api/auth/token/refresh")
                        .header("Origin", FRONTEND_ORIGIN)
                        .cookie(new MockCookie(
                                AuthCookieFactory.REFRESH_COOKIE,
                                "grace-id.secret"
                        )))
                .andExpect(status().isNoContent())
                .andExpect(header().string(AUTHORIZATION, "Bearer grace-access-token"))
                .andExpect(header().doesNotExist(SET_COOKIE));
    }

    @Test
    void tokenMutationsRejectMissingOrUntrustedOrigin() throws Exception {
        mockMvc.perform(post("/api/auth/token/refresh"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("AUTH_008"));

        mockMvc.perform(post("/api/auth/token/refresh")
                        .header("Origin", "https://evil.test"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("AUTH_008"));
    }

    @Test
    void logoutRevokesSessionAndClearsCookie() throws Exception {
        doNothing().when(logout).logout("refresh-id.secret");

        mockMvc.perform(post("/api/auth/logout")
                        .header("Origin", FRONTEND_ORIGIN)
                        .cookie(new MockCookie(
                                AuthCookieFactory.REFRESH_COOKIE,
                                "refresh-id.secret"
                        )))
                .andExpect(status().isNoContent())
                .andExpect(header().string(SET_COOKIE, containsString("Max-Age=0")));
    }
}
