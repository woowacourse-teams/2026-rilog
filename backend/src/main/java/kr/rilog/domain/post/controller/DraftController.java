package kr.rilog.domain.post.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.controller.dto.response.DraftIdResponse;
import kr.rilog.domain.post.service.DraftService;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.result.DraftIdResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class DraftController {

    private final DraftService draftService;

    @AuthGuard
    @PostMapping("/drafts")
    public ApiResponse<DraftIdResponse> saveDraft(
            @LoginUserId Long userId,
            @Valid @RequestBody DraftSaveCommand command
    ) {
        DraftIdResult result = draftService.saveDraft(command, userId);
        DraftIdResponse data = DraftIdResponse.from(result);
        return ApiResponse.response(HttpStatus.CREATED, "최초 임시저장에 성공했습니다.", data);
    }

}
