package kr.rilog.domain.comment.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.comment.controller.dto.request.CommentAnchorAddRequest;
import kr.rilog.domain.comment.controller.dto.request.CommentAnchorCreateRequest;
import kr.rilog.domain.comment.controller.dto.response.CommentAnchorCreateResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentAnchorListResponse;
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
                    게시글 본문에 존재하는 활성 선택 영역에 인라인 댓글을 추가합니다.
                    - 공개 게시글에는 로그인한 사용자 누구나, 비공개 게시글에는 작성자 본인만 작성할 수 있습니다.
                    - selection은 요청한 게시글에 속한 ACTIVE 상태여야 합니다.
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

}
