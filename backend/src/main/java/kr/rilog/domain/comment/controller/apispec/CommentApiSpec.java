package kr.rilog.domain.comment.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.comment.controller.dto.request.CommentCreateRequest;
import kr.rilog.domain.comment.controller.dto.request.CommentUpdateRequest;
import kr.rilog.domain.comment.controller.dto.response.CommentCreateResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentListResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "댓글 API")
public interface CommentApiSpec {

    @Operation(
            summary = "게시글 댓글 목록 조회 API",
            description = "게시글의 루트 댓글과 답글을 함께 조회합니다. 삭제된 루트 댓글은 활성 답글이 있는 경우 삭제 상태로 응답됩니다."
    )
    ApiResponse<CommentListResponse> readComments(
            @Parameter(description = "게시글 ID", example = "1")
            @PathVariable Long postId
    );

    @Operation(
            summary = "게시글 댓글 작성 API",
            description = "게시글에 루트 댓글을 작성합니다."
    )
    ApiResponse<CommentCreateResponse> createComment(
            @PathVariable Long postId,
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody CommentCreateRequest request
    );

    @Operation(
            summary = "게시글 답글 작성 API",
            description = "루트 댓글에 답글을 작성합니다. 답글에는 다시 답글을 작성할 수 없습니다."
    )
    ApiResponse<CommentCreateResponse> createReply(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody CommentCreateRequest request
    );

    @Operation(
            summary = "댓글 수정 API",
            description = "작성자 본인의 댓글 또는 답글 내용을 수정합니다."
    )
    ApiResponse<Void> updateComment(
            @PathVariable Long commentId,
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody CommentUpdateRequest request
    );

    @Operation(
            summary = "댓글 삭제 API",
            description = "작성자 본인의 댓글 또는 답글을 삭제합니다."
    )
    ApiResponse<Void> deleteComment(
            @PathVariable Long commentId,
            @Parameter(hidden = true) @LoginUserId Long requesterId
    );

}
