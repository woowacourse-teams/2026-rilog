package kr.rilog.domain.comment.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.comment.controller.apispec.CommentAnchorApiSpec;
import kr.rilog.domain.comment.controller.dto.request.CommentAnchorCreateRequest;
import kr.rilog.domain.comment.controller.dto.response.CommentAnchorCreateResponse;
import kr.rilog.domain.comment.service.CommentAnchorService;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class CommentAnchorController implements CommentAnchorApiSpec {

    private final CommentAnchorService commentAnchorService;

    @AuthGuard
    @PostMapping("/posts/{postId}/comment-anchors")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CommentAnchorCreateResponse> createCommentAnchor(
            @PathVariable Long postId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody CommentAnchorCreateRequest request
    ) {
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                postId,
                requesterId,
                request.toCommand()
        );
        CommentAnchorCreateResponse data = CommentAnchorCreateResponse.from(result);
        return ApiResponse.response(HttpStatus.CREATED, "인라인 댓글을 작성했습니다.", data);
    }

}
