package kr.rilog.domain.post.controller;

import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.service.DraftService;
import kr.rilog.domain.post.service.dto.result.DraftListResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DraftControllerTest {

    @Test
    @DisplayName("GET /v1/drafts/me는 로그인 사용자의 임시저장 목록을 조회한다.")
    void readMyDraftListReturnsAuthenticatedUsersDrafts() throws Exception {
        // given
        DraftService draftService = mock(DraftService.class);
        LocalDateTime publishedAt = LocalDateTime.of(2026, 8, 25, 12, 0);
        when(draftService.readMyDraftList(7L, 1, 2))
                .thenReturn(new DraftListResult(
                        List.of(new DraftListResult.DraftItemResult(10L, "임시저장 제목", publishedAt)),
                        1,
                        2,
                        1,
                        false
                ));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new DraftController(draftService))
                .setCustomArgumentResolvers(new FixedLoginUserIdArgumentResolver(7L))
                .build();

        // when - then
        mockMvc.perform(get("/v1/drafts/me")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.drafts[0].draftId").value(10L))
                .andExpect(jsonPath("$.data.drafts[0].title").value("임시저장 제목"))
                .andExpect(jsonPath("$.data.drafts[0].publishedAt").value("2026-08-25T12:00:00"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.numberOfElements").value(1))
                .andExpect(jsonPath("$.data.hasNext").value(false));

        verify(draftService).readMyDraftList(7L, 1, 2);
    }

    private record FixedLoginUserIdArgumentResolver(Long userId) implements HandlerMethodArgumentResolver {

        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(LoginUserId.class);
        }

        @Override
        public Object resolveArgument(
                MethodParameter parameter,
                ModelAndViewContainer mavContainer,
                NativeWebRequest webRequest,
                WebDataBinderFactory binderFactory
        ) {
            return userId;
        }
    }
}
