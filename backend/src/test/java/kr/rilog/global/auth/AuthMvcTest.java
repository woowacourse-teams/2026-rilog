package kr.rilog.global.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import kr.rilog.auth.application.UserQueryService;
import kr.rilog.auth.application.port.AccessTokenCodec;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.auth.domain.GlobalRole;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.global.auth.annotation.LoginRequired;
import kr.rilog.global.auth.annotation.LoginUserId;
import kr.rilog.global.auth.annotation.LoginUserSlug;
import kr.rilog.global.auth.annotation.RequireRole;
import kr.rilog.global.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.global.auth.resolver.LoginUserSlugArgumentResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

class AuthMvcTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AccessTokenCodec codec = new TextTokenCodec();
        User user = User.builder().id(7L).githubId(123L).slug("rilog").build();
        UserQueryService userQueryService = new UserQueryService(new SingleUserStore(user));
        AuthInterceptor interceptor = new AuthInterceptor(
                new AuthRequirementResolver(), codec
        );
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new PublicController(), new SecuredController(), new AdminController()
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .addInterceptors(interceptor)
                .setCustomArgumentResolvers(
                        new LoginUserIdArgumentResolver(),
                        new LoginUserSlugArgumentResolver(userQueryService)
                )
                .build();
    }

    @Test
    @DisplayName("공개 API는 액세스 토큰 없이 호출할 수 있다.")
    void publicEndpointDoesNotRequireToken() throws Exception {
        // given
        String endpoint = "/test/public";

        // when
        ResultActions result = mockMvc.perform(get(endpoint));

        // then
        result
                .andExpect(status().isOk())
                .andExpect(content().string("public"));
    }

    @Test
    @DisplayName("클래스 인증과 로그인 사용자 인자는 검증된 액세스 토큰을 사용한다.")
    void classAuthenticationAndPrincipalArgumentsUseVerifiedTokenOnce() throws Exception {
        // given
        String accessToken = "Bearer user-token";

        // when
        ResultActions result = mockMvc.perform(get("/test/secure/me")
                .header("Authorization", accessToken));

        // then
        result
                .andExpect(status().isOk())
                .andExpect(content().string("7:rilog"));
    }

    @Test
    @DisplayName("토큰이 없으면 인증에 실패하고 일반 사용자는 관리자 API에 접근할 수 없다.")
    void missingTokenIsUnauthorizedAndUserCannotAccessAdminMethod() throws Exception {
        // given
        String userAccessToken = "Bearer user-token";

        // when
        ResultActions missingTokenResult = mockMvc.perform(get("/test/secure/me"));
        ResultActions userRoleResult = mockMvc.perform(get("/test/secure/admin")
                .header("Authorization", userAccessToken));

        // then
        missingTokenResult
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTH_001"));

        userRoleResult
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("AUTH_003"));
    }

    @Test
    @DisplayName("클래스의 관리자 권한 조건은 메서드의 로그인 조건으로 약화되지 않는다.")
    void classAdminRequirementCannotBeWeakenedByMethodLoginAnnotation() throws Exception {
        // given
        String userAccessToken = "Bearer user-token";
        String adminAccessToken = "Bearer admin-token";

        // when
        ResultActions userRoleResult = mockMvc.perform(get("/test/admin/strong")
                .header("Authorization", userAccessToken));
        ResultActions adminRoleResult = mockMvc.perform(get("/test/admin/strong")
                .header("Authorization", adminAccessToken));

        // then
        userRoleResult
                .andExpect(status().isForbidden());

        adminRoleResult
                .andExpect(status().isOk())
                .andExpect(content().string("admin"));
    }

    @RestController
    @RequestMapping("/test")
    static class PublicController {

        @GetMapping("/public")
        String publicEndpoint() {
            return "public";
        }

    }

    @RestController
    @LoginRequired
    @RequestMapping("/test/secure")
    static class SecuredController {

        @GetMapping("/me")
        String me(@LoginUserId Long userId, @LoginUserSlug String slug) {
            return userId + ":" + slug;
        }

        @RequireRole(GlobalRole.ADMIN)
        @GetMapping("/admin")
        String admin() {
            return "admin";
        }

    }

    @RestController
    @RequireRole(GlobalRole.ADMIN)
    @RequestMapping("/test/admin")
    static class AdminController {

        @LoginRequired
        @GetMapping("/strong")
        String strong() {
            return "admin";
        }

    }

    private static final class TextTokenCodec implements AccessTokenCodec {

        @Override
        public String issue(AuthPrincipal principal) {
            throw new UnsupportedOperationException();
        }

        @Override
        public AuthPrincipal verify(String token) {
            return switch (token) {
                case "user-token" -> new AuthPrincipal(7L, GlobalRole.USER);
                case "admin-token" -> new AuthPrincipal(7L, GlobalRole.ADMIN);
                default -> throw new IllegalArgumentException("invalid token");
            };
        }

    }

    private record SingleUserStore(User user) implements UserStore {

        @Override
        public User save(User user) {
            return user;
        }

        @Override
        public Optional<User> findById(Long id) {
            return user.getId().equals(id) ? Optional.of(user) : Optional.empty();
        }

        @Override
        public Optional<User> findByGithubId(Long githubId) {
            return Optional.empty();
        }

        @Override
        public Optional<User> findBySlug(String slug) {
            return Optional.empty();
        }

    }

}
