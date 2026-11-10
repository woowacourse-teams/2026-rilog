package kr.rilog.domain.comment.controller;

import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.comment.service.CommentAnchorCommandService;
import kr.rilog.domain.comment.service.CommentAnchorQueryService;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorAddCommand;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;
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

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CommentAnchorControllerTest {

    private static final Long POST_ID = 1L;
    private static final Long SELECTION_ID = 2L;
    private static final Long REQUESTER_ID = 7L;

    @Test
    @DisplayName("같은 멱등키로 새 선택 영역 댓글 작성을 다시 요청하면 한 번만 작성하고 같은 응답을 반환한다.")
    void createCommentAnchorCreatesOnceForSameIdempotencyKey() throws Exception {
        // given
        CommentAnchorCommandService service = mock(CommentAnchorCommandService.class);
        when(service.createCommentAnchor(eq(POST_ID), eq(REQUESTER_ID), any(CommentAnchorCreateCommand.class)))
                .thenReturn(new CommentAnchorCreateResult(10L))
                .thenReturn(new CommentAnchorCreateResult(11L));
        MockMvc mockMvc = idempotentMockMvc(service);
        String idempotencyKey = UUID.randomUUID().toString();

        // when - then
        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(post("/v1/posts/{postId}/comment-anchors", POST_ID)
                            .header("Idempotency-Key", idempotencyKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "blockId": "block-1",
                                      "startOffset": 0,
                                      "endOffset": 5,
                                      "selectedText": "선택한 문장",
                                      "content": "댓글 내용"
                                    }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.commentAnchorId").value(10L));
        }

        verify(service).createCommentAnchor(eq(POST_ID), eq(REQUESTER_ID), any(CommentAnchorCreateCommand.class));
    }

    @Test
    @DisplayName("같은 멱등키로 기존 선택 영역 댓글 추가를 다시 요청하면 한 번만 작성하고 같은 응답을 반환한다.")
    void addCommentAnchorCreatesOnceForSameIdempotencyKey() throws Exception {
        // given
        CommentAnchorCommandService service = mock(CommentAnchorCommandService.class);
        when(service.addCommentAnchor(eq(POST_ID), eq(REQUESTER_ID), eq(SELECTION_ID), any(CommentAnchorAddCommand.class)))
                .thenReturn(new CommentAnchorCreateResult(10L))
                .thenReturn(new CommentAnchorCreateResult(11L));
        MockMvc mockMvc = idempotentMockMvc(service);
        String idempotencyKey = UUID.randomUUID().toString();

        // when - then
        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(post("/v1/posts/{postId}/selections/{selectionId}/comment-anchors", POST_ID, SELECTION_ID)
                            .header("Idempotency-Key", idempotencyKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "content": "댓글 내용"
                                    }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.commentAnchorId").value(10L));
        }

        verify(service).addCommentAnchor(eq(POST_ID), eq(REQUESTER_ID), eq(SELECTION_ID), any(CommentAnchorAddCommand.class));
    }

    private MockMvc idempotentMockMvc(CommentAnchorCommandService service) {
        AspectJProxyFactory factory = new AspectJProxyFactory(new CommentAnchorController(service, mock(CommentAnchorQueryService.class)));
        factory.setProxyTargetClass(true);
        factory.addAspect(new IdempotentRequestAspect(new CompletedRequestStore()));
        CommentAnchorController controller = factory.getProxy();
        return MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new FixedLoginUserIdArgumentResolver(REQUESTER_ID))
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
