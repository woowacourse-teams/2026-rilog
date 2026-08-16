package kr.rilog.domain.post.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.auth.resolver.NullableLoginUserIdArgumentResolver;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponseV2;
import kr.rilog.domain.post.controller.dto.response.affiliation.RilogPostAffiliationResponse;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PostControllerTest {

    private static final Long POST_ID = 1L;
    private static final String BLOG_SLUG = "writer";

    @Test
    @DisplayName("블로그의 공개 게시글 상세 조회는 로그인하지 않아도 가능하다")
    void getPostOfBlogsAllowsAnonymousUser() throws Exception {
        // given
        PostService postService = mock(PostService.class);
        when(postService.readPostOfBlogs(BLOG_SLUG, POST_ID, null)).thenReturn(response());
        MockMvc mockMvc = mockMvc(postService);

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts/{postId}", BLOG_SLUG, POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.affiliation.type").value("RILOG"));

        verify(postService).readPostOfBlogs(BLOG_SLUG, POST_ID, null);
    }

    @Test
    @DisplayName("블로그 게시글 상세 조회에 Access Token이 있으면 로그인 사용자 ID를 전달한다")
    void getPostOfBlogsPassesRequesterIdWhenAccessTokenExists() throws Exception {
        // given
        PostService postService = mock(PostService.class);
        when(postService.readPostOfBlogs(BLOG_SLUG, POST_ID, 7L)).thenReturn(response());
        MockMvc mockMvc = mockMvc(postService);

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts/{postId}", BLOG_SLUG, POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200));

        verify(postService).readPostOfBlogs(BLOG_SLUG, POST_ID, 7L);
    }

    @Test
    @DisplayName("블로그 게시글 상세 조회에 잘못된 Authorization 헤더가 있으면 요청을 거부한다")
    void getPostOfBlogsRejectsInvalidAuthorizationHeader() throws Exception {
        // given
        PostService postService = mock(PostService.class);
        MockMvc mockMvc = mockMvc(postService);

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts/{postId}", BLOG_SLUG, POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Basic access-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_AUTHORIZATION_HEADER"));

        verifyNoInteractions(postService);
    }

    private MockMvc mockMvc(PostService postService) {
        AccessTokenService accessTokenService = new AccessTokenService(new FixedAccessTokenProvider());
        return MockMvcBuilders.standaloneSetup(new PostController(postService))
                .addInterceptors(new BearerAuthenticationInterceptor(accessTokenService))
                .setCustomArgumentResolvers(
                        new LoginUserIdArgumentResolver(),
                        new NullableLoginUserIdArgumentResolver()
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private PostDetailResponseV2 response() {
        return new PostDetailResponseV2(
                "게시글 제목",
                null,
                null,
                "https://example.com/thumbnail.png",
                "기술",
                new PostDetailResponseV2.AuthorResponse(
                        "작성자",
                        7L,
                        "writer",
                        "https://example.com/profile.png"
                ),
                new RilogPostAffiliationResponse(
                        BlogType.RILOG,
                        1L,
                        BLOG_SLUG,
                        "작성자 블로그",
                        "https://example.com/profile.png"
                )
        );
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
