package kr.rilog.domain.chapter.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.chapter.controller.dto.request.ChapterCreateRequest;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.chapter.service.ChapterService;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
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
public class ChapterController {

    private final ChapterService chapterService;

    @AuthGuard
    @PostMapping("/blogs/{slug}/chapters")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ChapterResponse> create(
            @PathVariable String slug,
            @LoginUserId Long requesterId,
            @Valid @RequestBody ChapterCreateRequest request
    ) {
        ChapterResult result = chapterService.create(slug, requesterId, request.toCommand());
        return ApiResponse.response(HttpStatus.CREATED, "챕터를 생성했습니다.", ChapterResponse.from(result));
    }

}
