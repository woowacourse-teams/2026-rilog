package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.token.AuthTokenPairIssuer;
import kr.rilog.domain.auth.application.oauth.CompleteOAuthLogin;
import kr.rilog.domain.auth.application.oauth.OAuthLoginAttempt;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.application.oauth.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.OAuthLoginUserService;
import kr.rilog.domain.auth.application.token.login.LoginTokenIssueService;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenProvider;
import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.SocialLoginUser;
import kr.rilog.domain.auth.application.oauth.StartOAuthLogin;
import kr.rilog.domain.auth.application.port.oauth.OAuthAccessTokenClient;
import kr.rilog.domain.auth.application.port.oauth.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.application.port.oauth.OAuthUserClient;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.port.token.RefreshTokenGenerator;
import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.infrastructure.github.GithubOAuthAuthorizationUrlProvider;
import kr.rilog.domain.auth.application.port.token.RefreshSessionStore;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.domain.blog.entity.vo.Slug;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GithubOAuthControllerTest {

    @Test
    @DisplayName("GET /v1/auth/github는 redirectUrl을 state와 함께 저장하고 GitHub 인증 페이지로 redirect한다")
    void startGithubLoginRedirectsToGithubAuthorizationPage() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        MockMvc mockMvc = mockMvc(store);

        // when
        MvcResult result = mockMvc.perform(get("/v1/auth/github")
                        .queryParam("redirectUrl", "/feeds"))
                .andExpect(status().isFound())
                .andExpect(header().string(
                        "Location",
                        startsWith("https://github.com/login/oauth/authorize?")
                ))
                .andReturn();

        // then
        String location = result.getResponse().getHeader(HttpHeaders.LOCATION);
        String state = UriComponentsBuilder.fromUriString(location)
                .build()
                .getQueryParams()
                .getFirst("state");
        assertThat(store.find(SocialLoginProvider.GITHUB, state))
                .map(OAuthLoginAttempt::redirectUrl)
                .contains("/feeds");
    }

    @Test
    @DisplayName("PENDING 사용자의 callback은 Onboarding Token만 발급한다")
    void callbackIssuesOnlyOnboardingTokenForPendingUser() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt("valid-state", "/feeds"), Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store);

        // when - then
        mockMvc.perform(post("/v1/auth/github/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackRequest("github-code", "valid-state")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.AUTHORIZATION, "Bearer onboarding-token:1"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.data.onboardingStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.redirectUrl").value("/feeds"));
    }

    @Test
    @DisplayName("온보딩이 완료된 사용자의 callback은 Access Token과 Refresh Token을 발급한다")
    void callbackIssuesAccessTokenAndRefreshTokenForCompletedUser() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt("valid-state", "/posts/1"), Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store, User.builder()
                .id(1L)
                .githubId(1L)
                .slug(Slug.from("jinriro"))
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build());

        // when - then
        mockMvc.perform(post("/v1/auth/github/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackRequest("github-code", "valid-state")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.AUTHORIZATION, "Bearer access-token:1:USER:jinriro"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("refresh_token=raw-refresh-token"),
                        containsString("Path=/v1/auth"),
                        containsString("Max-Age=1209600"),
                        containsString("HttpOnly"),
                        containsString("SameSite=Lax")
                )))
                .andExpect(jsonPath("$.data.onboardingStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.data.redirectUrl").value("/posts/1"));
    }

    @Test
    @DisplayName("온보딩이 완료된 사용자의 callback은 사용자 역할을 Access Token에 담는다")
    void callbackIssuesAccessTokenWithUserRole() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt("valid-state", "/feeds"), Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store, User.builder()
                .id(1L)
                .githubId(1L)
                .slug(Slug.from("jinriro"))
                .globalRole(GlobalRole.ADMIN)
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build());

        // when - then
        mockMvc.perform(post("/v1/auth/github/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackRequest("github-code", "valid-state")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.AUTHORIZATION, "Bearer access-token:1:ADMIN:jinriro"));
    }

    @Test
    @DisplayName("온보딩이 완료된 사용자의 callback은 Onboarding Token을 발급하지 않는다")
    void callbackDoesNotIssueOnboardingTokenForCompletedUser() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt("valid-state", "/feeds"), Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store, User.builder()
                .id(1L)
                .githubId(1L)
                .slug(Slug.from("jinriro"))
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build());

        // when - then
        mockMvc.perform(post("/v1/auth/github/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackRequest("github-code", "valid-state")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.AUTHORIZATION, "Bearer access-token:1:USER:jinriro"));
    }

    @Test
    @DisplayName("callback code 또는 state가 없으면 요청을 거부한다")
    void callbackRejectsMissingCodeOrState() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt("valid-state", "/feeds"), Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store);

        // when - then
        mockMvc.perform(post("/v1/auth/github/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "state": "valid-state"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OAUTH_CALLBACK_PARAMETER_MISSING"));
    }

    @Test
    @DisplayName("재사용된 callback state는 요청을 거부한다")
    void callbackRejectsReusedState() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt("valid-state", "/feeds"), Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store);

        mockMvc.perform(post("/v1/auth/github/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackRequest("github-code", "valid-state")))
                .andExpect(status().isOk());

        // when - then
        mockMvc.perform(post("/v1/auth/github/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackRequest("github-code", "valid-state")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_OAUTH_STATE"));
    }

    @Test
    @DisplayName("GitHub OAuth 실패 callback은 요청을 거부한다")
    void callbackRejectsGithubOAuthError() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new InMemoryOAuthLoginAttemptStore());

        // when - then
        mockMvc.perform(post("/v1/auth/github/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "error": "access_denied",
                                  "state": "valid-state"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OAUTH_REQUEST_FAILED"));
    }

    private MockMvc mockMvc(OAuthLoginAttemptStore store) {
        return mockMvc(store, User.builder()
                .id(1L)
                .githubId(1L)
                .build());
    }

    private MockMvc mockMvc(OAuthLoginAttemptStore store, User loginUser) {
        OAuthLoginUserService loginUserService = mock(OAuthLoginUserService.class);
        when(loginUserService.findOrCreate(any(SocialLoginUser.class))).thenReturn(loginUser);

        GithubOAuthProperties properties = GithubOAuthProperties.of(
                "github-client-id",
                "github-client-secret",
                URI.create("https://www.rilog.kr/auth/github/callback"),
                Duration.ofMinutes(5),
                "read:user,user:email"
        );
        GithubOAuthController controller = new GithubOAuthController(
                new StartOAuthLogin(
                        store,
                        List.of(new GithubOAuthAuthorizationUrlProvider(properties))
                ),
                new CompleteOAuthLogin(
                        store,
                        List.of(new StubOAuthAccessTokenClient()),
                        List.of(new StubOAuthUserClient()),
                        loginUserService
                ),
                new LoginTokenIssueService(
                        new FixedOnboardingTokenProvider(),
                        new AuthTokenPairIssuer(
                                new FixedAccessTokenProvider(),
                                refreshTokenIssuer()
                        )
                ),
                new RefreshTokenCookieFactory(RefreshTokenProperties.of(
                        Duration.ofDays(14),
                        "refresh_token",
                        "/v1/auth",
                        false,
                        "Lax"
                ))
        );

        return MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private RefreshTokenProvider refreshTokenIssuer() {
        RefreshSessionStore refreshSessionStore = mock(RefreshSessionStore.class);
        return new RefreshTokenProvider(
                new FixedRefreshTokenGenerator(),
                new FixedRefreshTokenHasher(),
                refreshSessionStore,
                RefreshTokenProperties.of(Duration.ofDays(14), "refresh_token", "/v1/auth", false, "Lax"),
                Clock.systemUTC()
        );
    }

    private static String callbackRequest(String code, String state) {
        return """
                {
                  "code": "%s",
                  "state": "%s"
                }
                """.formatted(code, state);
    }

    private static class InMemoryOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

        private final Map<String, OAuthLoginAttempt> attempts = new HashMap<>();

        @Override
        public void save(SocialLoginProvider provider, OAuthLoginAttempt attempt, Duration ttl) {
            attempts.put(key(provider, attempt.state()), attempt);
        }

        @Override
        public Optional<OAuthLoginAttempt> consume(SocialLoginProvider provider, String state) {
            return Optional.ofNullable(attempts.remove(key(provider, state)));
        }

        public Optional<OAuthLoginAttempt> find(SocialLoginProvider provider, String state) {
            return Optional.ofNullable(attempts.get(key(provider, state)));
        }

        private String key(SocialLoginProvider provider, String state) {
            return provider.name() + ":" + state;
        }
    }

    private static class StubOAuthAccessTokenClient implements OAuthAccessTokenClient {

        @Override
        public SocialLoginProvider provider() {
            return SocialLoginProvider.GITHUB;
        }

        @Override
        public OAuthAccessToken exchange(String code) {
            return new OAuthAccessToken("github-access-token");
        }
    }

    private static class StubOAuthUserClient implements OAuthUserClient {

        @Override
        public SocialLoginProvider provider() {
            return SocialLoginProvider.GITHUB;
        }

        @Override
        public SocialLoginUser getUser(OAuthAccessToken accessToken) {
            return new SocialLoginUser(
                    SocialLoginProvider.GITHUB,
                    "1",
                    "octocat",
                    "https://github.com/images/error/octocat_happy.gif"
            );
        }
    }

    private static class FixedRefreshTokenGenerator implements RefreshTokenGenerator {

        @Override
        public RefreshToken generate() {
            return RefreshToken.of("raw-refresh-token");
        }
    }

    private static class FixedRefreshTokenHasher implements RefreshTokenHasher {

        @Override
        public String hash(RefreshToken refreshToken) {
            return "hashed-refresh-token";
        }
    }

    private static class FixedOnboardingTokenProvider implements OnboardingTokenProvider {

        @Override
        public OnboardingToken issue(Long userId) {
            return OnboardingToken.of("onboarding-token:%d".formatted(userId));
        }

        @Override
        public OnboardingTokenClaims parse(String onboardingToken) {
            throw new UnsupportedOperationException("Not used in this test");
        }
    }

    private static class FixedAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            return AccessToken.of("access-token:%d:%s:%s".formatted(userId, role, slug));
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            return AccessTokenClaims.of(
                    1L,
                    GlobalRole.USER,
                    "jinriro",
                    Instant.parse("2026-08-13T00:00:00Z"),
                    Instant.parse("2026-08-13T00:15:00Z")
            );
        }
    }
}
