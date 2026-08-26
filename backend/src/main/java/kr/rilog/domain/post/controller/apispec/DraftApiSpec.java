package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.controller.dto.response.DraftIdResponse;
import kr.rilog.domain.post.controller.dto.response.DraftListResponse;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "임시저장 API")
public interface DraftApiSpec {

    @Operation(
            summary = "최초 임시저장 API",
            description = "초안을 최초 임시저장합니다."
    )
    ApiResponse<DraftIdResponse> saveDraft(
            @LoginUserId Long userId,
            @Valid @RequestBody DraftSaveCommand command
    );

    @Operation(
            summary = "임시저장 목록 조회 API (정렬 - 최신순 하드코딩)",
            description = "로그인 사용자의 임시저장 게시글 목록을 최신순으로 조회합니다."
    )
    ApiResponse<DraftListResponse> readMyDraftList(
            @LoginUserId Long requesterId,
            @RequestParam int page,
            @RequestParam int size
    );

}
