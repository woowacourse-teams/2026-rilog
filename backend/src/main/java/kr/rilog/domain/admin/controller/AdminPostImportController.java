package kr.rilog.domain.admin.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.admin.controller.apispec.AdminPostImportApiSpec;
import kr.rilog.domain.admin.controller.dto.request.AdminPostImportRequest;
import kr.rilog.domain.admin.service.AdminPostImportService;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.token.TokenType;
import kr.rilog.domain.post.controller.dto.response.PostPublishResponse;
import kr.rilog.domain.upload.controller.dto.request.PreSignedUrlCreateRequest;
import kr.rilog.domain.upload.controller.dto.response.PresignedUrlCreateResponse;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/admin/users/{targetUserId}")
public class AdminPostImportController implements AdminPostImportApiSpec {

    private final AdminPostImportService importService;

    @AuthGuard(value = TokenType.ACCESS, roles = GlobalRole.ADMIN)
    @PostMapping("/uploads/presigned-url")
    public ApiResponse<PresignedUrlCreateResponse> createUploadUrl(
            @PathVariable Long targetUserId,
            @Valid @RequestBody PreSignedUrlCreateRequest request
    ) {
        var command = new PresignedUrlCreateCommand(
                request.fileName(), request.contentType(), request.size(), request.type()
        );
        var result = importService.createUploadUrl(targetUserId, command);
        return ApiResponse.response(HttpStatus.OK, "PresignedUrl을 정상적으로 발급했습니다",
                PresignedUrlCreateResponse.from(result));
    }

    @AuthGuard(value = TokenType.ACCESS, roles = GlobalRole.ADMIN)
    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PostPublishResponse> publish(
            @LoginUserId Long operatorId,
            @PathVariable Long targetUserId,
            @Valid @RequestBody AdminPostImportRequest request
    ) {
        var result = importService.publish(targetUserId, request.toCommand(), request.publishedAt().toInstant());
        log.atInfo()
                .addKeyValue("event", "admin_post_imported")
                .addKeyValue("operatorId", operatorId)
                .addKeyValue("targetUserId", targetUserId)
                .addKeyValue("postId", result.postId())
                .addKeyValue("blogSlug", result.slug())
                .log("관리자 게시글 이관을 완료했습니다.");
        return ApiResponse.response(HttpStatus.CREATED, "게시글이 발행되었습니다.", PostPublishResponse.from(result));
    }
}
