package kr.rilog.domain.post.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.NullableLoginUserIdArgumentResolver;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.service.FeedService;
import kr.rilog.domain.post.service.dto.command.BlogFeedSearchCommand;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FeedControllerTest {

    @Test
    @DisplayName("GET /v1/feeds/posts는 전체 피드 게시글 목록을 조회한다")
    void readFullFeedPostsReturnsPosts() throws Exception {
        // given
        FeedService feedService = mock(FeedService.class);
        when(feedService.readFullFeedPostList(1, 2))
                .thenReturn(new FullFeedPostResponse(
                        List.of(
                                new FullFeedPostResponse.PostItemResponse(
                                        10L,
                                        "개인 게시글 제목",
                                        "https://example.com/thumbnail.png",
                                        "기술",
                                        "PUBLIC",
                                        LocalDateTime.of(2026, 8, 13, 12, 0),
                                        new ChapterResponse(20L, "Spring", 0),
                                        new FullFeedPostResponse.AuthorResponse(
                                                1L,
                                                "작성자",
                                                "writer",
                                                "https://example.com/profile.png"
                                        ),
                                        new FullFeedPostResponse.OwnerResponse(
                                                BlogType.RILOG,
                                                2L,
                                                "writer",
                                                "작성자",
                                                "https://example.com/profile.png"
                                        )
                                ),
                                new FullFeedPostResponse.PostItemResponse(
                                        11L,
                                        "팀 게시글 제목",
                                        "https://example.com/team-thumbnail.png",
                                        "기술",
                                        "PUBLIC",
                                        LocalDateTime.of(2026, 8, 13, 13, 0),
                                        null,
                                        new FullFeedPostResponse.AuthorResponse(
                                                1L,
                                                "작성자",
                                                "writer",
                                                "https://example.com/profile.png"
                                        ),
                                        new FullFeedPostResponse.OwnerResponse(
                                                BlogType.COLOG,
                                                3L,
                                                "rilog-team",
                                                "리로그 팀",
                                                "https://example.com/team-logo.png"
                                        )
                                )
                        ),
                        1,
                        2,
                        2,
                        false
                ));
        MockMvc mockMvc = mockMvc(feedService);

        // when - then
        mockMvc.perform(get("/v1/feeds/posts")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.posts[0].postId").value(10L))
                .andExpect(jsonPath("$.data.posts[0].chapter.chapterId").value(20L))
                .andExpect(jsonPath("$.data.posts[0].chapter.name").value("Spring"))
                .andExpect(jsonPath("$.data.posts[0].chapter.order").value(0))
                .andExpect(jsonPath("$.data.posts[0].author.nickname").value("작성자"))
                .andExpect(jsonPath("$.data.posts[0].author.slug").value("writer"))
                .andExpect(jsonPath("$.data.posts[0].owner.type").value("RILOG"))
                .andExpect(jsonPath("$.data.posts[0].owner.name").value("작성자"))
                .andExpect(jsonPath("$.data.posts[1].postId").value(11L))
                .andExpect(jsonPath("$.data.posts[1].chapter").doesNotExist())
                .andExpect(jsonPath("$.data.posts[1].author.nickname").value("작성자"))
                .andExpect(jsonPath("$.data.posts[1].owner.type").value("COLOG"))
                .andExpect(jsonPath("$.data.posts[1].owner.name").value("리로그 팀"))
                .andExpect(jsonPath("$.data.posts[1].owner.slug").value("rilog-team"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.numberOfElements").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(false));

        verify(feedService).readFullFeedPostList(1, 2);
    }

    @Test
    @DisplayName("GET /v1/blogs/{slug}/posts는 공개 블로그 게시글 목록을 조회한다")
    void getPublicBlogPostsReturnsPosts() throws Exception {
        // given
        FeedService feedService = mock(FeedService.class);
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(null, null, null, 1, 2);
        when(feedService.readBlogPosts("rilog-team", null, command))
                .thenReturn(new PublicBlogFeedPostResponse(
                        "COLOG",
                        List.of(new PublicBlogFeedPostResponse.PostItemResponse(
                                10L,
                                "팀 게시글 제목",
                                "https://example.com/thumbnail.png",
                                "기술",
                                "PUBLIC",
                                LocalDateTime.of(2026, 8, 13, 12, 0),
                                new ChapterResponse(21L, "회고", 1),
                                new PublicBlogFeedPostResponse.AuthorResponse(
                                        1L,
                                        "작성자",
                                        "writer",
                                        "https://example.com/profile.png"
                                ),
                                new PublicBlogFeedPostResponse.OwnerResponse(
                                        BlogType.COLOG,
                                        2L,
                                        "rilog-team",
                                        "리로그 팀",
                                        "https://example.com/logo.png"
                                )
                        )),
                        1,
                        2,
                        1,
                        false
                ));
        MockMvc mockMvc = mockMvc(feedService);

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts", "rilog-team")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("COLOG"))
                .andExpect(jsonPath("$.data.posts[0].postId").value(10L))
                .andExpect(jsonPath("$.data.posts[0].chapter.chapterId").value(21L))
                .andExpect(jsonPath("$.data.posts[0].chapter.name").value("회고"))
                .andExpect(jsonPath("$.data.posts[0].chapter.order").value(1))
                .andExpect(jsonPath("$.data.posts[0].author.nickname").value("작성자"))
                .andExpect(jsonPath("$.data.posts[0].author.slug").value("writer"))
                .andExpect(jsonPath("$.data.posts[0].owner.type").value("COLOG"))
                .andExpect(jsonPath("$.data.posts[0].owner.name").value("리로그 팀"))
                .andExpect(jsonPath("$.data.posts[0].owner.slug").value("rilog-team"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(false));

        verify(feedService).readBlogPosts("rilog-team", null, command);
    }

    @Test
    @DisplayName("GET /v1/blogs/{slug}/posts는 로그인 사용자와 카테고리·챕터 필터를 전달한다.")
    void getBlogPostsPassesRequesterCategoryAndChapterFilters() throws Exception {
        // given
        FeedService feedService = mock(FeedService.class);
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(Category.DAILY, 21L, null, 1, 2);
        when(feedService.readBlogPosts("writer", 7L, command))
                .thenReturn(emptyBlogFeedResponse("RILOG"));
        MockMvc mockMvc = mockMvc(feedService);

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts", "writer")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .param("category", "DAILY")
                        .param("chapterId", "21")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk());

        verify(feedService).readBlogPosts("writer", 7L, command);
    }

    @Test
    @DisplayName("GET /v1/blogs/{slug}/posts는 대상 Colog 필터를 전달한다.")
    void getBlogPostsPassesTargetCologFilter() throws Exception {
        // given
        FeedService feedService = mock(FeedService.class);
        BlogFeedSearchCommand command = new BlogFeedSearchCommand(Category.TECH, null, "rilog-team", 0, 12);
        when(feedService.readBlogPosts("writer", null, command))
                .thenReturn(emptyBlogFeedResponse("RILOG"));
        MockMvc mockMvc = mockMvc(feedService);

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts", "writer")
                        .param("category", "TECH")
                        .param("targetCologSlug", "rilog-team")
                        .param("page", "0")
                        .param("size", "12"))
                .andExpect(status().isOk());

        verify(feedService).readBlogPosts("writer", null, command);
    }

    @Test
    @DisplayName("기존 팀 피드 조회 경로는 제공하지 않는다")
    void getTeamPostsPathIsRemoved() throws Exception {
        // given
        FeedService feedService = mock(FeedService.class);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new FeedController(feedService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/cologs/{cologSlug}/posts", "rilog-team")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isNotFound());
    }

    private MockMvc mockMvc(FeedService feedService) {
        return MockMvcBuilders.standaloneSetup(new FeedController(feedService))
                .addInterceptors(new BearerAuthenticationInterceptor(
                        new FixedAccessTokenProvider(),
                        mock(OnboardingTokenProvider.class)
                ))
                .setCustomArgumentResolvers(new NullableLoginUserIdArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private PublicBlogFeedPostResponse emptyBlogFeedResponse(String blogType) {
        return new PublicBlogFeedPostResponse(blogType, List.of(), 0, 12, 0, false);
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
