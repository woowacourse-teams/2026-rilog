package kr.rilog.domain.auth.interceptor;

import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.annotation.LoginUserSlug;
import kr.rilog.domain.auth.application.AccessToken;
import kr.rilog.domain.auth.application.AccessTokenClaims;
import kr.rilog.domain.auth.application.AccessTokenService;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.AccessTokenProvider;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.auth.resolver.LoginUserSlugArgumentResolver;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BearerAuthenticationInterceptorTest {

    @Test
    @DisplayName("Bearer Access Token을 검증하고 인증 사용자 정보를 요청 컨텍스트에 저장한다")
    void storesAuthenticatedUserClaimsInRequestContext() throws Exception {
        // given
        RecordingAccessTokenProvider accessTokenProvider = new RecordingAccessTokenProvider();
        MockMvc mockMvc = mockMvc(accessTokenProvider);

        // when - then
        mockMvc.perform(get("/v1/protected")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer rilog-access-token"))
                .andExpect(status().isOk())
                .andExpect(content().string("7:jinriro"));

        assertThat(accessTokenProvider.parsedToken).isEqualTo("rilog-access-token");
    }

    @Test
    @DisplayName("USER 역할 사용자는 USER 권한 API에 접근할 수 있다")
    void userRoleCanAccessUserEndpoint() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider(GlobalRole.USER));

        // when - then
        mockMvc.perform(get("/v1/user")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer user-access-token"))
                .andExpect(status().isOk())
                .andExpect(content().string("user-only:7"));
    }

    @Test
    @DisplayName("ADMIN 역할 사용자는 ADMIN 권한 API에 접근할 수 있다")
    void adminRoleCanAccessAdminEndpoint() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider(GlobalRole.ADMIN));

        // when - then
        mockMvc.perform(get("/v1/admin")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer admin-access-token"))
                .andExpect(status().isOk())
                .andExpect(content().string("admin-only"));
    }

    @Test
    @DisplayName("필요한 역할이 없는 사용자는 접근을 거부한다")
    void rejectsUserWithoutRequiredRole() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider(GlobalRole.USER));

        // when - then
        mockMvc.perform(get("/v1/admin")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer user-access-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("AUTHORIZATION_FAILED"));
    }

    @Test
    @DisplayName("인가 대상 API도 인증되지 않은 요청은 거부한다")
    void rejectsUnauthenticatedRequestBeforeAuthorization() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider(GlobalRole.ADMIN));

        // when - then
        mockMvc.perform(get("/v1/admin"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTHORIZATION_HEADER_MISSING"));
    }

    @Test
    @DisplayName("인증이 필요하지 않은 요청은 Authorization 헤더가 없어도 통과한다")
    void skipsPublicRequestWithoutAuthorizationHeader() throws Exception {
        // given
        RecordingAccessTokenProvider accessTokenProvider = new RecordingAccessTokenProvider();
        MockMvc mockMvc = mockMvc(accessTokenProvider);

        // when - then
        mockMvc.perform(get("/v1/public"))
                .andExpect(status().isOk())
                .andExpect(content().string("public"));

        assertThat(accessTokenProvider.parsedToken).isNull();
    }

    @Test
    @DisplayName("인증이 필요한 요청에 Authorization 헤더가 없으면 거부한다")
    void rejectsMissingAuthorizationHeader() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider());

        // when - then
        mockMvc.perform(get("/v1/protected"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTHORIZATION_HEADER_MISSING"));
    }

    @Test
    @DisplayName("@AuthGuard가 붙은 요청은 토큰 값을 파라미터로 쓰지 않아도 인증을 검사한다")
    void authenticatesRequestAnnotatedWithAuthGuardWithoutLoginUserParameter() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider());

        // when - then
        mockMvc.perform(get("/v1/authenticated-without-claims"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTHORIZATION_HEADER_MISSING"));
    }

    @Test
    @DisplayName("@LoginUserId는 @AuthGuard가 붙은 요청에서만 사용할 수 있다")
    void rejectsLoginUserIdParameterWithoutAuthGuardAnnotation() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider());

        // when - then
        mockMvc.perform(get("/v1/misconfigured-user-id")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer rilog-access-token"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("AUTHENTICATION_ANNOTATION_MISSING"));
    }

    @Test
    @DisplayName("@LoginUserSlug는 @AuthGuard가 붙은 요청에서만 사용할 수 있다")
    void rejectsLoginUserSlugParameterWithoutAuthGuardAnnotation() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider());

        // when - then
        mockMvc.perform(get("/v1/misconfigured-user-slug")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer rilog-access-token"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("AUTHENTICATION_ANNOTATION_MISSING"));
    }

    @Test
    @DisplayName("Bearer 형식이 아닌 Authorization 헤더는 거부한다")
    void rejectsInvalidAuthorizationHeaderFormat() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new RecordingAccessTokenProvider());

        // when - then
        mockMvc.perform(get("/v1/protected")
                        .header(HttpHeaders.AUTHORIZATION, "Basic rilog-access-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_AUTHORIZATION_HEADER"));
    }

    @Test
    @DisplayName("Access Token 파싱 예외는 인증 실패 응답으로 처리된다")
    void handlesAccessTokenParseException() throws Exception {
        // given
        AccessTokenProvider accessTokenProvider = new ThrowingAccessTokenProvider();
        MockMvc mockMvc = mockMvc(accessTokenProvider);

        // when - then
        mockMvc.perform(get("/v1/protected")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer expired-access-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("EXPIRED_ACCESS_TOKEN"));
    }

    private MockMvc mockMvc(AccessTokenProvider accessTokenProvider) {
        return MockMvcBuilders.standaloneSetup(new TestController())
                .addInterceptors(new BearerAuthenticationInterceptor(new AccessTokenService(accessTokenProvider)))
                .setCustomArgumentResolvers(
                        new LoginUserIdArgumentResolver(),
                        new LoginUserSlugArgumentResolver()
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @RestController
    private static class TestController {

        @AuthGuard
        @GetMapping("/v1/protected")
        public String protectedEndpoint(@LoginUserId Long userId, @LoginUserSlug String slug) {
            return userId + ":" + slug;
        }

        @AuthGuard(roles = GlobalRole.USER)
        @GetMapping("/v1/user")
        public String userEndpoint(@LoginUserId Long userId) {
            return "user-only:" + userId;
        }

        @AuthGuard(roles = GlobalRole.ADMIN)
        @GetMapping("/v1/admin")
        public String adminEndpoint() {
            return "admin-only";
        }

        @AuthGuard
        @GetMapping("/v1/authenticated-without-claims")
        public String authenticatedWithoutClaims() {
            return "authenticated";
        }

        @GetMapping("/v1/misconfigured-user-id")
        public String misconfiguredUserId(@LoginUserId Long userId) {
            return userId.toString();
        }

        @GetMapping("/v1/misconfigured-user-slug")
        public String misconfiguredUserSlug(@LoginUserSlug String slug) {
            return slug;
        }

        @GetMapping("/v1/public")
        public String publicEndpoint() {
            return "public";
        }
    }

    private static class RecordingAccessTokenProvider implements AccessTokenProvider {

        private final GlobalRole role;
        private String parsedToken;

        RecordingAccessTokenProvider() {
            this(GlobalRole.USER);
        }

        RecordingAccessTokenProvider(GlobalRole role) {
            this.role = role;
        }

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            throw new UnsupportedOperationException();
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            this.parsedToken = accessToken;
            return AccessTokenClaims.of(
                    7L,
                    role,
                    "jinriro",
                    Instant.parse("2026-08-13T00:00:00Z"),
                    Instant.parse("2026-08-13T00:15:00Z")
            );
        }
    }

    private static class ThrowingAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            throw new UnsupportedOperationException();
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            throw new AuthException(AuthErrorInformation.EXPIRED_ACCESS_TOKEN);
        }
    }
}
