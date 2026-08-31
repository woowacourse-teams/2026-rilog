package kr.rilog.domain.comment.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.comment.controller.apispec.CommentApiSpec;
import kr.rilog.domain.comment.controller.dto.request.CommentCreateRequest;
import kr.rilog.domain.comment.controller.dto.request.CommentUpdateRequest;
import kr.rilog.domain.comment.controller.dto.response.CommentCreateResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentListResponse;
import kr.rilog.domain.comment.service.CommentService;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class CommentController implements CommentApiSpec {

    private final CommentService commentService;

    @GetMapping("/posts/{postId}/comments")
    public ApiResponse<CommentListResponse> readComments(@PathVariable Long postId) {
        CommentListResponse data = commentService.readComments(postId);
        return ApiResponse.response(HttpStatus.OK, "댓글 목록 조회에 성공했습니다.", data);
    }

    @AuthGuard
    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CommentCreateResponse> createComment(
            @PathVariable Long postId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody CommentCreateRequest request
    ) {
        CommentCreateResponse data = commentService.createComment(postId, requesterId, request.toCommand());
        return ApiResponse.response(HttpStatus.CREATED, "댓글을 작성했습니다.", data);
    }

    @AuthGuard
    @PostMapping("/posts/{postId}/comments/{commentId}/replies")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CommentCreateResponse> createReply(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody CommentCreateRequest request
    ) {
        CommentCreateResponse data = commentService.createReply(postId, commentId, requesterId, request.toCommand());
        return ApiResponse.response(HttpStatus.CREATED, "답글을 작성했습니다.", data);
    }

    @AuthGuard
    @PatchMapping("/comments/{commentId}")
    public ApiResponse<Void> updateComment(
            @PathVariable Long commentId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody CommentUpdateRequest request
    ) {
        commentService.updateComment(commentId, requesterId, request.toCommand());
        return ApiResponse.response(HttpStatus.OK, "댓글을 수정했습니다.");
    }

    @AuthGuard
    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ApiResponse<Void> deleteComment(
            @PathVariable Long commentId,
            @LoginUserId Long requesterId
    ) {
        commentService.deleteComment(commentId, requesterId);
        return ApiResponse.response(HttpStatus.NO_CONTENT, "댓글을 삭제했습니다.");
    }

}
