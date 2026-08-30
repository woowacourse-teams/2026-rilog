package kr.rilog.domain.chapter.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.chapter.controller.dto.request.ChapterCreateRequest;
import kr.rilog.domain.chapter.controller.dto.request.ChapterRenameRequest;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.chapter.service.ChapterService;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping("/blogs/{slug}/chapters")
    public ApiResponse<List<ChapterResponse>> readAll(@PathVariable String slug) {
        List<ChapterResponse> data = chapterService.readAll(slug).stream()
                .map(ChapterResponse::from)
                .toList();
        return ApiResponse.response(HttpStatus.OK, "챕터 목록을 조회했습니다.", data);
    }

    @AuthGuard
    @PutMapping("/blogs/{slug}/chapters/{chapterId}")
    public ApiResponse<ChapterResponse> rename(
            @PathVariable String slug,
            @PathVariable Long chapterId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody ChapterRenameRequest request
    ) {
        ChapterResult result = chapterService.rename(slug, chapterId, requesterId, request.toCommand());
        return ApiResponse.response(HttpStatus.OK, "챕터 이름을 변경했습니다.", ChapterResponse.from(result));
    }

}
