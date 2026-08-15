package kr.rilog.domain.blog.controller;

import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.service.BlogMemberService;
import kr.rilog.domain.blog.service.dto.result.BlogMemberResult;
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

class BlogMemberControllerTest {

    @Test
    @DisplayName("GET /v1/cologs/{slug}/members는 팀 멤버 목록을 조회한다")
    void getCologMembersReturnsMembers() throws Exception {
        // given
        BlogMemberService blogMemberService = mock(BlogMemberService.class);
        when(blogMemberService.getCologMembers("rilog-team"))
                .thenReturn(List.of(
                        new BlogMemberResult(
                                1L,
                                10L,
                                "리로",
                                "jinriro",
                                "https://example.com/profile.png",
                                BlogPermission.OWNER,
                                "Backend",
                                LocalDateTime.of(2026, 8, 13, 12, 0)
                        )
                ));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new BlogMemberController(blogMemberService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/cologs/{slug}/members", "rilog-team"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(1L))
                .andExpect(jsonPath("$.data[0].userId").value(10L))
                .andExpect(jsonPath("$.data[0].nickname").value("리로"))
                .andExpect(jsonPath("$.data[0].slug").value("jinriro"))
                .andExpect(jsonPath("$.data[0].profileImageUrl").value("https://example.com/profile.png"))
                .andExpect(jsonPath("$.data[0].permission").value("OWNER"))
                .andExpect(jsonPath("$.data[0].blogRole").value("Backend"))
                .andExpect(jsonPath("$.data[0].joinedAt").value("2026-08-13T12:00:00"));

        verify(blogMemberService).getCologMembers("rilog-team");
    }

}
