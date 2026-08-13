package kr.rilog.domain.user.controller;

import kr.rilog.domain.user.service.UserQueryService;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {

    @Test
    @DisplayName("GET /v1/users/{slug}는 멤버 초대에 사용할 사용자 정보를 조회한다")
    void getUserInfoReturnsUserInfoForInvite() throws Exception {
        // given
        UserQueryService userQueryService = mock(UserQueryService.class);
        when(userQueryService.getUserInfo("jinriro"))
                .thenReturn(new UserInfoResult(
                        1L,
                        "리로",
                        "jinriro",
                        "https://example.com/profile.png"
                ));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userQueryService))
                .build();

        // when - then
        mockMvc.perform(get("/v1/users/{slug}", "jinriro"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1L))
                .andExpect(jsonPath("$.data.nickname").value("리로"))
                .andExpect(jsonPath("$.data.slug").value("jinriro"))
                .andExpect(jsonPath("$.data.profileImageUrl").value("https://example.com/profile.png"));

        verify(userQueryService).getUserInfo("jinriro");
    }
}
