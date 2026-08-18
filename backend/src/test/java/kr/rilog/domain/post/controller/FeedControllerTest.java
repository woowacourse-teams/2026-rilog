package kr.rilog.domain.post.controller;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
import kr.rilog.domain.post.service.FeedService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

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
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new FeedController(feedService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/feeds/posts")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.posts[0].postId").value(10L))
                .andExpect(jsonPath("$.data.posts[0].author.nickname").value("작성자"))
                .andExpect(jsonPath("$.data.posts[0].author.slug").value("writer"))
                .andExpect(jsonPath("$.data.posts[0].owner.type").value("RILOG"))
                .andExpect(jsonPath("$.data.posts[0].owner.name").value("작성자"))
                .andExpect(jsonPath("$.data.posts[1].postId").value(11L))
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
    @DisplayName("GET /v1/blogs/@{slug}/posts는 공개 블로그 게시글 목록을 조회한다")
    void getPublicBlogPostsReturnsPosts() throws Exception {
        // given
        FeedService feedService = mock(FeedService.class);
        when(feedService.readPublicBlogPosts("rilog-team", 1, 2))
                .thenReturn(new PublicBlogFeedPostResponse(
                        "COLOG",
                        List.of(new PublicBlogFeedPostResponse.PostItemResponse(
                                10L,
                                "팀 게시글 제목",
                                "https://example.com/thumbnail.png",
                                "기술",
                                "PUBLIC",
                                LocalDateTime.of(2026, 8, 13, 12, 0),
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
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new FeedController(feedService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/blogs/@{slug}/posts", "rilog-team")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("COLOG"))
                .andExpect(jsonPath("$.data.posts[0].postId").value(10L))
                .andExpect(jsonPath("$.data.posts[0].author.nickname").value("작성자"))
                .andExpect(jsonPath("$.data.posts[0].author.slug").value("writer"))
                .andExpect(jsonPath("$.data.posts[0].owner.type").value("COLOG"))
                .andExpect(jsonPath("$.data.posts[0].owner.name").value("리로그 팀"))
                .andExpect(jsonPath("$.data.posts[0].owner.slug").value("rilog-team"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(false));

        verify(feedService).readPublicBlogPosts("rilog-team", 1, 2);
    }

    @Test
    @DisplayName("골뱅이 없는 공개 블로그 게시글 목록 조회 경로는 제공하지 않는다")
    void getPublicBlogPostsPathWithoutAtSignIsRemoved() throws Exception {
        // given
        FeedService feedService = mock(FeedService.class);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new FeedController(feedService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/blogs/{slug}/posts", "rilog-team")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isNotFound());
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

}
