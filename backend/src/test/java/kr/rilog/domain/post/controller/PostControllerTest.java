package kr.rilog.domain.post.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.auth.resolver.NullableLoginUserIdArgumentResolver;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.owner.RilogOwnerResponse;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PostControllerTest {

    private static final Long POST_ID = 1L;
    private static final String BLOG_SLUG = "writer";

    @Test
    @DisplayName("게시글 발행은 request body의 slug를 발행 대상 블로그 slug로 전달한다")
    void createPassesSlugFromRequestBody() throws Exception {
        // given
        PostService postService = mock(PostService.class);
        when(postService.publish(any(PostSaveCommand.class), eq(7L)))
                .thenReturn(new PostPublishResult(31L, BLOG_SLUG));
        MockMvc mockMvc = mockMvc(postService);

        // when - then
        mockMvc.perform(post("/v1/posts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "writer",
                                  "title": "BlockNote 도입기",
                                  "content": [],
                                  "category": "TECH",
                                  "visibility": "PUBLIC",
                                  "thumbnailImageUrl": null,
                                  "profileImageUrl": null
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.data.postId").value(31))
                .andExpect(jsonPath("$.data.slug").value(BLOG_SLUG));

        ArgumentCaptor<PostSaveCommand> commandCaptor = ArgumentCaptor.forClass(PostSaveCommand.class);
        verify(postService).publish(commandCaptor.capture(), eq(7L));
        assertThat(commandCaptor.getValue().slug()).isEqualTo(BLOG_SLUG);
    }

    @Test
    @DisplayName("블로그의 공개 게시글 상세 조회는 로그인하지 않아도 가능하다")
    void getPostDetailsAllowsAnonymousUser() throws Exception {
        // given
        PostService postService = mock(PostService.class);
        when(postService.readPostOfBlogs(POST_ID, null)).thenReturn(response());
        MockMvc mockMvc = mockMvc(postService);

        // when - then
        mockMvc.perform(get("/v1/posts/{postId}", POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.chapter.chapterId").value(12L))
                .andExpect(jsonPath("$.data.chapter.name").value("Spring"))
                .andExpect(jsonPath("$.data.chapter.order").value(0))
                .andExpect(jsonPath("$.data.owner.type").value("RILOG"))
                .andExpect(jsonPath("$.data.viewerPermissions.canEdit").value(false))
                .andExpect(jsonPath("$.data.viewerPermissions.canDelete").value(false));

        verify(postService).readPostOfBlogs(POST_ID, null);
    }

    @Test
    @DisplayName("미분류 게시글 상세 조회 응답은 chapter를 null로 반환한다.")
    void getPostDetailsReturnsNullChapterForUnclassifiedPost() throws Exception {
        // given
        PostService postService = mock(PostService.class);
        when(postService.readPostOfBlogs(POST_ID, null)).thenReturn(responseWithoutChapter());
        MockMvc mockMvc = mockMvc(postService);

        // when - then
        mockMvc.perform(get("/v1/posts/{postId}", POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.chapter").value(nullValue()));
    }

    @Test
    @DisplayName("블로그 게시글 상세 조회에 Access Token이 있으면 로그인 사용자 ID를 전달한다")
    void getPostDetailsPassesRequesterIdWhenAccessTokenExists() throws Exception {
        // given
        PostService postService = mock(PostService.class);
        when(postService.readPostOfBlogs(POST_ID, 7L)).thenReturn(response());
        MockMvc mockMvc = mockMvc(postService);

        // when - then
        mockMvc.perform(get("/v1/posts/{postId}", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200));

        verify(postService).readPostOfBlogs(POST_ID, 7L);
    }

    @Test
    @DisplayName("블로그 게시글 상세 조회에 잘못된 Authorization 헤더가 있으면 요청을 거부한다")
    void getPostDetailsRejectsInvalidAuthorizationHeader() throws Exception {
        // given
        PostService postService = mock(PostService.class);
        MockMvc mockMvc = mockMvc(postService);

        // when - then
        mockMvc.perform(get("/v1/posts/{postId}", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Basic access-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_AUTHORIZATION_HEADER"));

        verifyNoInteractions(postService);
    }

    private MockMvc mockMvc(PostService postService) {
        return MockMvcBuilders.standaloneSetup(new PostController(postService))
                .addInterceptors(new BearerAuthenticationInterceptor(
                        new FixedAccessTokenProvider(),
                        mock(OnboardingTokenProvider.class)
                ))
                .setCustomArgumentResolvers(
                        new LoginUserIdArgumentResolver(),
                        new NullableLoginUserIdArgumentResolver()
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private PostDetailResponse response() {
        return new PostDetailResponse(
                "게시글 제목",
                null,
                null,
                "https://example.com/thumbnail.png",
                "기술",
                new ChapterResponse(12L, "Spring", 0),
                new PostDetailResponse.AuthorResponse(
                        "작성자",
                        7L,
                        "writer",
                        "https://example.com/profile.png"
                ),
                new RilogOwnerResponse(
                        BlogType.RILOG,
                        1L,
                        BLOG_SLUG,
                        "작성자 블로그",
                        "https://example.com/profile.png"
                ),
                PostDetailResponse.ViewerPermissionsResponse.none()
        );
    }

    private PostDetailResponse responseWithoutChapter() {
        PostDetailResponse response = response();
        return new PostDetailResponse(
                response.title(),
                response.content(),
                response.publishedAt(),
                response.thumbnailImageUrl(),
                response.category(),
                null,
                response.author(),
                response.owner(),
                response.viewerPermissions()
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
