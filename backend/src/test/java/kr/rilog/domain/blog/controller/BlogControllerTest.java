package kr.rilog.domain.blog.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.service.BlogService;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BlogControllerTest {

    @ParameterizedTest
    @ValueSource(strings = {"Ab1_", "12345678901234567890", "ri-log_01"})
    @DisplayName("GET /v1/availability/slug는 블로그 슬러그 사용 가능 여부를 확인한다")
    void validateSlugAcceptsValidSlug(String slug) throws Exception {
        // given
        BlogService blogService = mock(BlogService.class);
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/availability/slug")
                        .param("slug", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("사용가능한 슬러그입니다."));

        verify(blogService).validateDuplicatedSlug(slug);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "123456789012345678901"})
    @DisplayName("GET /v1/availability/slug는 길이가 올바르지 않은 슬러그를 거절한다")
    void validateSlugRejectsInvalidLength(String slug) throws Exception {
        // given
        BlogService blogService = mock(BlogService.class);
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/availability/slug")
                        .param("slug", slug))
                .andExpect(status().isBadRequest());

        verify(blogService, never()).validateDuplicatedSlug(slug);
    }

    @Test
    @DisplayName("GET /v1/availability/slug는 중복된 블로그 슬러그이면 중복 오류를 반환한다")
    void validateSlugRejectsDuplicatedSlug() throws Exception {
        // given
        String slug = "ri_log-01";
        BlogService blogService = mock(BlogService.class);
        doThrow(new BlogException(BLOG_SLUG_ALREADY_EXISTS))
                .when(blogService).validateDuplicatedSlug(slug);
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/availability/slug")
                        .param("slug", slug))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("BLOG_SLUG_ALREADY_EXISTS"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"러로", "12345678901234567890"})
    @DisplayName("GET /v1/availability/nickname은 블로그 프로필 이름 사용 가능 여부를 확인한다")
    void validateNicknameAcceptsValidNickname(String nickname) throws Exception {
        // given
        BlogService blogService = mock(BlogService.class);
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/availability/nickname")
                        .param("nickname", nickname))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("사용가능한 닉네임입니다."));

        verify(blogService).validateDuplicatedProfileName(nickname);
    }

    @ParameterizedTest
    @ValueSource(strings = {"러", "123456789012345678901"})
    @DisplayName("GET /v1/availability/nickname은 길이가 올바르지 않은 이름을 거절한다")
    void validateNicknameRejectsInvalidLength(String nickname) throws Exception {
        // given
        BlogService blogService = mock(BlogService.class);
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/availability/nickname")
                        .param("nickname", nickname))
                .andExpect(status().isBadRequest());

        verify(blogService, never()).validateDuplicatedProfileName(nickname);
    }

    @Test
    @DisplayName("GET /v1/availability/nickname은 중복된 블로그 프로필 이름이면 중복 오류를 반환한다")
    void validateNicknameRejectsDuplicatedProfileName() throws Exception {
        // given
        String nickname = "러로";
        BlogService blogService = mock(BlogService.class);
        doThrow(new BlogException(BLOG_PROFILE_NAME_ALREADY_EXISTS))
                .when(blogService).validateDuplicatedProfileName(nickname);
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/availability/nickname")
                        .param("nickname", nickname))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("BLOG_PROFILE_NAME_ALREADY_EXISTS"));
    }

    @Test
    @DisplayName("GET /v1/availability/nickname은 요청 파라미터가 없으면 거절한다")
    void validateNicknameRejectsMissingParameter() throws Exception {
        // given
        BlogService blogService = mock(BlogService.class);
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/availability/nickname"))
                .andExpect(status().isBadRequest());

        verify(blogService, never()).validateDuplicatedProfileName(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("GET /v1/blogs/@{slug}는 블로그 컨트롤러에서 공개 프로필 정보를 조회한다")
    void getPublicProfileReturnsBlogProfile() throws Exception {
        // given
        BlogService blogService = mock(BlogService.class);
        when(blogService.getPublicProfile("rilog-team"))
                .thenReturn(new CologPublicProfileResult(
                        2L,
                        "리로그 팀",
                        "rilog-team",
                        "함께 쓰는 기술 블로그",
                        "https://example.com/logo.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        10L,
                        24L
                ));
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/blogs/@{slug}", "rilog-team"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("COLOG"))
                .andExpect(jsonPath("$.data.id").value(2L))
                .andExpect(jsonPath("$.data.name").value("리로그 팀"))
                .andExpect(jsonPath("$.data.slug").value("rilog-team"))
                .andExpect(jsonPath("$.data.introduction").value("함께 쓰는 기술 블로그"))
                .andExpect(jsonPath("$.data.profileImageUrl").value("https://example.com/logo.png"))
                .andExpect(jsonPath("$.data.coverImageUrl").value("https://example.com/cover.png"))
                .andExpect(jsonPath("$.data.serviceUrl").value("https://rilog.example.com"))
                .andExpect(jsonPath("$.data.githubUrl").value("https://github.com/rilog"))
                .andExpect(jsonPath("$.data.memberCount").value(10L))
                .andExpect(jsonPath("$.data.postCount").value(24L))
                .andExpect(jsonPath("$.data.user").doesNotExist());

        verify(blogService).getPublicProfile("rilog-team");
    }

    @Test
    @DisplayName("GET /v1/users/me/cologs/preview는 인증된 사용자의 팀 목록을 조회한다")
    void getMyCologsPreviewReturnsAuthenticatedUsersCologs() throws Exception {
        // given
        BlogService blogService = mock(BlogService.class);
        when(blogService.getMyCologsPreview(7L))
                .thenReturn(List.of(new MyCologResponse(1L, "rilog-team", "리로그 팀", "https://example.com/logo.png")));
        MockMvc mockMvc = mockMvc(blogService);

        // when - then
        mockMvc.perform(get("/v1/users/me/cologs/preview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].cologId").value(1L))
                .andExpect(jsonPath("$.data[0].slug").value("rilog-team"))
                .andExpect(jsonPath("$.data[0].name").value("리로그 팀"))
                .andExpect(jsonPath("$.data[0].profileImageUrl").value("https://example.com/logo.png"));

        verify(blogService).getMyCologsPreview(7L);
    }

    private MockMvc mockMvc(BlogService blogService) {
        AccessTokenService accessTokenService = new AccessTokenService(new FixedAccessTokenProvider());
        return MockMvcBuilders.standaloneSetup(new BlogController(blogService))
                .addInterceptors(new BearerAuthenticationInterceptor(accessTokenService))
                .setCustomArgumentResolvers(new LoginUserIdArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static class FixedAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            throw new UnsupportedOperationException();
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            return AccessTokenClaims.of(
                    7L,
                    GlobalRole.USER,
                    "writer",
                    Instant.parse("2026-08-13T00:00:00Z"),
                    Instant.parse("2026-08-13T00:15:00Z")
            );
        }
    }
}
