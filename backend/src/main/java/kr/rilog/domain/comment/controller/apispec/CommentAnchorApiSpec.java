package kr.rilog.domain.comment.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.comment.controller.dto.request.CommentAnchorAddRequest;
import kr.rilog.domain.comment.controller.dto.request.CommentAnchorCreateRequest;
import kr.rilog.domain.comment.controller.dto.request.CommentAnchorUpdateRequest;
import kr.rilog.domain.comment.controller.dto.response.CommentAnchorCreateResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentAnchorDeleteResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentAnchorListResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentAnchorUpdateResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "인라인 댓글 API")
public interface CommentAnchorApiSpec {

    @Operation(
            summary = "인라인 댓글 목록 조회 API",
            description = "게시글의 인라인 댓글을 본문 블록과 선택 영역별로 그룹화해 조회합니다."
    )
    ApiResponse<CommentAnchorListResponse> readCommentAnchors(
            @Parameter(description = "게시글 ID", example = "1")
            @PathVariable Long postId,
            @Parameter(hidden = true) @NullableLoginUserId Long requesterId
    );

    @Operation(
            summary = "인라인 댓글 작성 API",
            description = """
                    게시글 본문의 한 텍스트 블록 안에서 선택한 범위에 인라인 댓글을 작성합니다.
                    - 공개 게시글에는 로그인한 사용자 누구나, 비공개 게시글에는 작성자 본인만 작성할 수 있습니다.
                    - paragraph, heading, quote 블록에만 작성할 수 있습니다.
                    - startOffset, endOffset은 블록의 논리적 텍스트에서 UTF-16 code unit 기준의 [start, end) 범위입니다.
                    - selectedText는 서버가 직렬화한 블록 텍스트의 해당 범위와 정확히 같아야 합니다.
                    """
    )
    ApiResponse<CommentAnchorCreateResponse> createCommentAnchor(
            @Parameter(description = "게시글 ID", example = "1")
            @PathVariable Long postId,
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody CommentAnchorCreateRequest request
    );

    @Operation(
            summary = "기존 선택 영역에 인라인 댓글 추가 API",
            description = """
                    게시글 본문에 존재하는 선택 영역에 인라인 댓글을 추가합니다.
                    - 공개 게시글에는 로그인한 사용자 누구나, 비공개 게시글에는 작성자 본인만 작성할 수 있습니다.
                    - selection은 요청한 게시글에 속해야 하며, ACTIVE와 ORPHANED 상태 모두 댓글을 추가할 수 있습니다.
                    """
    )
    ApiResponse<CommentAnchorCreateResponse> addCommentAnchor(
            @Parameter(description = "게시글 ID", example = "1")
            @PathVariable Long postId,
            @Parameter(description = "Selection(선택범위) ID", example = "1")
            @PathVariable Long selectionId,
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody CommentAnchorAddRequest dto
    );

    @Operation(
            summary = "인라인 댓글 수정 API",
            description = """
                    인라인 댓글의 본문(content)을 수정합니다. 선택 범위(Selection)는 변경할 수 없습니다.
                    - 댓글 작성자 본인만 수정할 수 있습니다.
                    - 게시글을 조회할 수 없는 사용자는 수정할 수 없습니다. 비공개 게시글에서는 게시글 작성자 본인의 댓글만 수정할 수 있습니다.
                    - ACTIVE와 ORPHANED 상태의 댓글 모두 수정할 수 있습니다.
                    - 기존과 같은 본문으로 요청하면 변경 없이 성공하며 isEdited와 updatedAt은 바뀌지 않습니다.
                    """
    )
    ApiResponse<CommentAnchorUpdateResponse> updateCommentAnchor(
            @Parameter(description = "게시글 ID", example = "1")
            @PathVariable Long postId,
            @Parameter(description = "인라인 댓글 ID", example = "1")
            @PathVariable Long commentAnchorId,
            @Parameter(hidden = true) @LoginUserId Long requesterId,
            @Valid @RequestBody CommentAnchorUpdateRequest dto
    );

    @Operation(
            summary = "인라인 댓글 삭제 API",
            description = """
                    인라인 댓글을 삭제(소프트 삭제)합니다.
                    - 댓글 작성자, 게시글 작성자, 게시글이 속한 블로그의 OWNER/ADMIN만 삭제할 수 있습니다.
                    - 게시글을 조회할 수 없는 사용자는 삭제할 수 없습니다. 비공개 게시글에서는 게시글 작성자만 삭제할 수 있습니다.
                    - ACTIVE와 ORPHANED 상태의 댓글 모두 삭제할 수 있습니다.
                    - 선택 범위의 마지막 댓글을 삭제해도 선택 범위(Selection)는 유지됩니다.
                    - 이미 삭제된 댓글이나 요청한 게시글에 속하지 않은 댓글은 404를 반환합니다.
                    """
    )
    ApiResponse<CommentAnchorDeleteResponse> deleteCommentAnchor(
            @Parameter(description = "게시글 ID", example = "1")
            @PathVariable Long postId,
            @Parameter(description = "인라인 댓글 ID", example = "1")
            @PathVariable Long commentAnchorId,
            @Parameter(hidden = true) @LoginUserId Long requesterId
    );

}
