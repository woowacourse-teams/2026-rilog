package kr.rilog.domain.post.controller.apispec;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.post.controller.dto.response.DraftIdResponse;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.global.response.ApiResponse;
import org.springframework.web.bind.annotation.RequestBody;

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

}
