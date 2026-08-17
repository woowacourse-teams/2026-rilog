package kr.rilog.domain.post.controller;

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
    @DisplayName("GET /v1/blogs/{slug}/posts는 공개 블로그 게시글 목록을 조회한다")
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
                                new PublicBlogFeedPostResponse.CologResponse(
                                        2L,
                                        "리로그 팀",
                                        "rilog-team",
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
        mockMvc.perform(get("/v1/blogs/{slug}/posts", "rilog-team")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("COLOG"))
                .andExpect(jsonPath("$.data.posts[0].postId").value(10L))
                .andExpect(jsonPath("$.data.posts[0].user.slug").value("writer"))
                .andExpect(jsonPath("$.data.posts[0].colog.slug").value("rilog-team"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(false));

        verify(feedService).readPublicBlogPosts("rilog-team", 1, 2);
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
