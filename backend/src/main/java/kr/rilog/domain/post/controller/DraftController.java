package kr.rilog.domain.post.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.controller.apispec.DraftApiSpec;
import kr.rilog.domain.post.controller.dto.request.DraftPublishRequest;
import kr.rilog.domain.post.controller.dto.response.DraftDetailResponse;
import kr.rilog.domain.post.controller.dto.request.DraftOverwriteRequest;
import kr.rilog.domain.post.controller.dto.response.DraftIdResponse;
import kr.rilog.domain.post.controller.dto.response.DraftListResponse;
import kr.rilog.domain.post.controller.dto.response.PostPublishResponse;
import kr.rilog.domain.post.service.DraftService;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.result.DraftDetailResult;
import kr.rilog.domain.post.service.dto.result.DraftIdResult;
import kr.rilog.domain.post.service.dto.result.DraftListResult;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class DraftController implements DraftApiSpec {

    private final DraftService draftService;

    @AuthGuard
    @PostMapping("/drafts")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DraftIdResponse> saveDraft(
            @LoginUserId Long userId,
            @Valid @RequestBody DraftSaveCommand command
    ) {
        DraftIdResult result = draftService.saveDraft(command, userId);
        DraftIdResponse data = DraftIdResponse.from(result);
        return ApiResponse.response(HttpStatus.CREATED, "최초 임시저장에 성공했습니다.", data);
    }

    @AuthGuard
    @GetMapping("/drafts/me")
    public ApiResponse<DraftListResponse> readMyDraftList(
            @LoginUserId Long requesterId,
            @RequestParam int page,
            @RequestParam int size
    ) {
        DraftListResult result = draftService.readMyDraftList(requesterId, page, size);
        DraftListResponse data = DraftListResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "임시저장 목록 조회에 성공했습니다.", data);
    }

    @AuthGuard
    @PutMapping("/drafts/{postId}")
    public ApiResponse<DraftIdResponse> overwriteDraft(
            @PathVariable Long postId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody DraftOverwriteRequest dto
    ) {
        DraftIdResult result = draftService.overwriteDraft(dto.toCommand(), postId, requesterId);
        DraftIdResponse data = DraftIdResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "임시저장을 덮어썼습니다.", data);
    }

    @AuthGuard
    @DeleteMapping("/drafts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ApiResponse<Void> deleteDraft(
            @PathVariable Long postId,
            @LoginUserId Long requesterId
    ) {
        draftService.deleteDraft(postId, requesterId);
        return ApiResponse.response(HttpStatus.NO_CONTENT, "임시저장을 삭제했습니다.");
    }

    @AuthGuard
    @GetMapping("/drafts/{draftId}")
    public ApiResponse<DraftDetailResponse> getDraft(
            @LoginUserId Long requesterId,
            @PathVariable("draftId") Long draftId
    ) {
        DraftDetailResult result = draftService.getMyDraft(draftId, requesterId);
        DraftDetailResponse data = DraftDetailResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "임시저장 글을 성공적으로 불러왔습니다.", data);
    }

    @AuthGuard
    @PatchMapping("/drafts/{draftId}/publish")
    public ApiResponse<PostPublishResponse> publishDraft(
            @LoginUserId Long requesterId,
            @PathVariable("draftId") Long draftId,
            @Valid @RequestBody DraftPublishRequest dto
    ) {
        PostPublishResult result = draftService.publishDraft(dto.toCommand(), draftId, requesterId);
        PostPublishResponse data = PostPublishResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "임시저장 글을 성공적으로 발행했습니다.", data);
    }

}
