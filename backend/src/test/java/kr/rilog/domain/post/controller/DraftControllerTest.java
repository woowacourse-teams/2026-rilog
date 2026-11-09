package kr.rilog.domain.post.controller;

import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.service.DraftCommandService;
import kr.rilog.domain.post.service.DraftQueryService;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.result.DraftIdResult;
import kr.rilog.domain.post.service.dto.result.DraftListResult;
import kr.rilog.global.idempotency.CompletedRequestStore;
import kr.rilog.global.idempotency.IdempotentRequestAspect;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DraftControllerTest {

    private final DraftCommandService draftCommandService = mock(DraftCommandService.class);
    private final DraftQueryService draftQueryService = mock(DraftQueryService.class);

    @Test
    @DisplayName("GET /v1/drafts/me는 로그인 사용자의 임시저장 목록을 조회한다.")
    void readMyDraftListReturnsAuthenticatedUsersDrafts() throws Exception {
        // given
        LocalDateTime publishedAt = LocalDateTime.of(2026, 8, 25, 12, 0);
        when(draftQueryService.readMyDraftList(7L, 1, 2))
                .thenReturn(new DraftListResult(
                        List.of(new DraftListResult.DraftItemResult(10L, "임시저장 제목", publishedAt)),
                        1,
                        2,
                        1,
                        false
                ));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new DraftController(draftCommandService, draftQueryService))
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

        verify(draftQueryService).readMyDraftList(7L, 1, 2);
    }

    @Test
    @DisplayName("같은 멱등키로 최초 임시저장을 다시 요청하면 한 번만 저장하고 같은 응답을 반환한다.")
    void saveDraftSavesOnceForSameIdempotencyKey() throws Exception {
        // given
        when(draftCommandService.saveDraft(any(DraftSaveCommand.class), eq(7L)))
                .thenReturn(new DraftIdResult(10L))
                .thenReturn(new DraftIdResult(11L));
        MockMvc mockMvc = idempotentMockMvc();
        String idempotencyKey = UUID.randomUUID().toString();

        // when - then
        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(post("/v1/drafts")
                            .header("Idempotency-Key", idempotencyKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "title": "임시저장 제목",
                                      "content": []
                                    }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.draftId").value(10L));
        }

        verify(draftCommandService).saveDraft(any(DraftSaveCommand.class), eq(7L));
    }

    private MockMvc idempotentMockMvc() {
        AspectJProxyFactory factory = new AspectJProxyFactory(new DraftController(draftCommandService, draftQueryService));
        factory.setProxyTargetClass(true);
        factory.addAspect(new IdempotentRequestAspect(new CompletedRequestStore()));
        DraftController controller = factory.getProxy();
        return MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new FixedLoginUserIdArgumentResolver(7L))
                .build();
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
