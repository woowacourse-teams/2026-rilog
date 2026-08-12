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
import kr.rilog.domain.User;
import kr.rilog.global.advice.GlobalExceptionHandler;
import kr.rilog.global.auth.annotation.LoginRequired;
import kr.rilog.global.auth.annotation.LoginUserId;
import kr.rilog.global.auth.annotation.LoginUserSlug;
import kr.rilog.global.auth.annotation.RequireRole;
import kr.rilog.global.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.global.auth.resolver.LoginUserSlugArgumentResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
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
    void publicEndpointDoesNotRequireToken() throws Exception {
        mockMvc.perform(get("/test/public"))
                .andExpect(status().isOk())
                .andExpect(content().string("public"));
    }

    @Test
    void classAuthenticationAndPrincipalArgumentsUseVerifiedTokenOnce() throws Exception {
        mockMvc.perform(get("/test/secure/me")
                        .header("Authorization", "Bearer user-token"))
                .andExpect(status().isOk())
                .andExpect(content().string("7:rilog"));
    }

    @Test
    void missingTokenIsUnauthorizedAndUserCannotAccessAdminMethod() throws Exception {
        mockMvc.perform(get("/test/secure/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTH_001"));

        mockMvc.perform(get("/test/secure/admin")
                        .header("Authorization", "Bearer user-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("AUTH_003"));
    }

    @Test
    void classAdminRequirementCannotBeWeakenedByMethodLoginAnnotation() throws Exception {
        mockMvc.perform(get("/test/admin/strong")
                        .header("Authorization", "Bearer user-token"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/test/admin/strong")
                        .header("Authorization", "Bearer admin-token"))
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
