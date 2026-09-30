package kr.rilog.domain.post.controller;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.service.TrendingService;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.post.service.dto.result.FullFeedPostResult;
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

class TrendingControllerTest {

    @Test
    @DisplayName("GET /v1/feeds/trending/posts는 트렌딩 피드 필터를 전달한다.")
    void readTrendingPostsPassesFeedFilters() throws Exception {
        // given
        TrendingService trendingService = mock(TrendingService.class);
        FullFeedSearchCommand command = new FullFeedSearchCommand(
                Category.DAILY,
                BlogType.COLOG,
                1,
                2
        );
        when(trendingService.readTrendingPostList(command))
                .thenReturn(new FullFeedPostResult(
                        List.of(new FullFeedPostResult.PostItemResult(
                                10L,
                                "트렌딩 게시글",
                                "https://example.com/thumbnail.png",
                                Category.DAILY,
                                PostVisibility.PUBLIC,
                                LocalDateTime.of(2026, 9, 30, 12, 0),
                                3L,
                                20L,
                                "회고",
                                0,
                                1L,
                                "작성자",
                                "writer",
                                "https://example.com/writer.png",
                                BlogType.COLOG,
                                2L,
                                "rilog_team",
                                "리로그 팀",
                                "https://example.com/team.png"
                        )),
                        1,
                        2,
                        1,
                        false
                ));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new TrendingController(trendingService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/feeds/trending/posts")
                        .param("category", "DAILY")
                        .param("blogType", "COLOG")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.posts").isArray())
                .andExpect(jsonPath("$.data.posts[0].postId").value(10L))
                .andExpect(jsonPath("$.data.posts[0].totalCommentsCount").value(3L))
                .andExpect(jsonPath("$.data.posts[0].chapter.chapterId").value(20L))
                .andExpect(jsonPath("$.data.posts[0].author.slug").value("writer"))
                .andExpect(jsonPath("$.data.posts[0].owner.type").value("COLOG"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.numberOfElements").value(1))
                .andExpect(jsonPath("$.data.hasNext").value(false));

        verify(trendingService).readTrendingPostList(command);
    }
}
