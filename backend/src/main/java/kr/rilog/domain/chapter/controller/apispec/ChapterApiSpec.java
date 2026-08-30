package kr.rilog.domain.chapter.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.chapter.controller.dto.request.ChapterCreateRequest;
import kr.rilog.domain.chapter.controller.dto.request.ChapterRenameRequest;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@Tag(name = "챕터 API")
public interface ChapterApiSpec {

    @Operation(summary = "챕터 생성", description = "블로그의 마지막 순서에 새 챕터를 생성합니다.")
    ApiResponse<ChapterResponse> create(
            @PathVariable String slug,
            @LoginUserId Long requesterId,
            @Valid @RequestBody ChapterCreateRequest request
    );

    @Operation(summary = "챕터 목록 조회", description = "블로그의 활성 챕터를 순서대로 공개 조회합니다.")
    ApiResponse<List<ChapterResponse>> readAll(@PathVariable String slug);

    @Operation(summary = "챕터 이름 변경", description = "챕터의 이름을 변경합니다.")
    ApiResponse<ChapterResponse> rename(
            @PathVariable String slug,
            @PathVariable Long chapterId,
            @LoginUserId Long requesterId,
            @Valid @RequestBody ChapterRenameRequest request
    );

    // TODO 챕터 - 게시글 연결 해제
    @Operation(summary = "챕터 삭제", description = "챕터를 삭제합니다.")
    ApiResponse<Void> delete(
            @PathVariable String slug,
            @PathVariable Long chapterId,
            @LoginUserId Long requesterId
    );

}
