package kr.rilog.domain.comment.controller;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.auth.resolver.NullableLoginUserIdArgumentResolver;
import kr.rilog.domain.comment.controller.dto.response.CommentCreateResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentListResponse;
import kr.rilog.domain.comment.service.CommentService;
import kr.rilog.domain.comment.service.dto.command.CommentCreateCommand;
import kr.rilog.domain.comment.service.dto.command.CommentUpdateCommand;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CommentControllerTest {

    private static final Long POST_ID = 1L;
    private static final Long COMMENT_ID = 2L;
    private static final Long USER_ID = 7L;

    @Test
    @DisplayName("게시글 댓글 목록은 로그인하지 않아도 조회할 수 있다")
    void readCommentsAllowsAnonymousUser() throws Exception {
        // given
        CommentService commentService = mock(CommentService.class);
        when(commentService.readComments(POST_ID))
                .thenReturn(new CommentListResponse(List.of()));
        MockMvc mockMvc = mockMvc(commentService);

        // when - then
        mockMvc.perform(get("/v1/posts/{postId}/comments", POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.comments").isArray());

        verify(commentService).readComments(POST_ID);
    }

    @Test
    @DisplayName("게시글에 댓글을 작성한다")
    void createComment() throws Exception {
        // given
        CommentService commentService = mock(CommentService.class);
        when(commentService.createComment(eq(POST_ID), eq(USER_ID), any(CommentCreateCommand.class)))
                .thenReturn(new CommentCreateResponse(COMMENT_ID));
        MockMvc mockMvc = mockMvc(commentService);

        // when - then
        mockMvc.perform(post("/v1/posts/{postId}/comments", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "댓글입니다."
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.data.commentId").value(COMMENT_ID));

        ArgumentCaptor<CommentCreateCommand> commandCaptor = ArgumentCaptor.forClass(CommentCreateCommand.class);
        verify(commentService).createComment(eq(POST_ID), eq(USER_ID), commandCaptor.capture());
        assertThat(commandCaptor.getValue().content()).isEqualTo("댓글입니다.");
    }

    @Test
    @DisplayName("루트 댓글에 답글을 작성한다")
    void createReply() throws Exception {
        // given
        CommentService commentService = mock(CommentService.class);
        when(commentService.createReply(eq(POST_ID), eq(COMMENT_ID), eq(USER_ID), any(CommentCreateCommand.class)))
                .thenReturn(new CommentCreateResponse(3L));
        MockMvc mockMvc = mockMvc(commentService);

        // when - then
        mockMvc.perform(post("/v1/posts/{postId}/comments/{commentId}/replies", POST_ID, COMMENT_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "답글입니다."
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.commentId").value(3L));

        verify(commentService).createReply(eq(POST_ID), eq(COMMENT_ID), eq(USER_ID), any(CommentCreateCommand.class));
    }

    @Test
    @DisplayName("댓글 내용을 수정한다")
    void updateComment() throws Exception {
        // given
        CommentService commentService = mock(CommentService.class);
        MockMvc mockMvc = mockMvc(commentService);

        // when - then
        mockMvc.perform(patch("/v1/comments/{commentId}", COMMENT_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "수정된 댓글입니다."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200));

        ArgumentCaptor<CommentUpdateCommand> commandCaptor = ArgumentCaptor.forClass(CommentUpdateCommand.class);
        verify(commentService).updateComment(eq(COMMENT_ID), eq(USER_ID), commandCaptor.capture());
        assertThat(commandCaptor.getValue().content()).isEqualTo("수정된 댓글입니다.");
    }

    @Test
    @DisplayName("댓글을 삭제한다")
    void deleteComment() throws Exception {
        // given
        CommentService commentService = mock(CommentService.class);
        MockMvc mockMvc = mockMvc(commentService);

        // when - then
        mockMvc.perform(delete("/v1/comments/{commentId}", COMMENT_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isNoContent());

        verify(commentService).deleteComment(COMMENT_ID, USER_ID);
    }

    @Test
    @DisplayName("댓글 내용이 비어있으면 작성 요청을 거부한다")
    void createCommentRejectsBlankContent() throws Exception {
        // given
        CommentService commentService = mock(CommentService.class);
        MockMvc mockMvc = mockMvc(commentService);

        // when - then
        mockMvc.perform(post("/v1/posts/{postId}/comments", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": " "
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("REQUEST_VALIDATION_FAILED"));
    }

    private MockMvc mockMvc(CommentService commentService) {
        return MockMvcBuilders.standaloneSetup(new CommentController(commentService))
                .addInterceptors(new BearerAuthenticationInterceptor(
                        new StubAccessTokenProvider(),
                        mock(OnboardingTokenProvider.class)
                ))
                .setCustomArgumentResolvers(
                        new LoginUserIdArgumentResolver(),
                        new NullableLoginUserIdArgumentResolver()
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static class StubAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            throw new UnsupportedOperationException();
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            return AccessTokenClaims.of(
                    USER_ID,
                    GlobalRole.USER,
                    "writer",
                    Instant.parse("2026-08-13T00:00:00Z"),
                    Instant.parse("2026-08-13T00:15:00Z")
            );
        }
    }
}
