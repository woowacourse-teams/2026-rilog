package kr.rilog.domain.blog.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.service.BlogService;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BlogControllerTest {

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
                .andExpect(jsonPath("$.data.logoUrl").value("https://example.com/logo.png"))
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
                .andExpect(jsonPath("$.data[0].cologName").value("리로그 팀"))
                .andExpect(jsonPath("$.data[0].logoUrl").value("https://example.com/logo.png"));

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
