package kr.rilog.domain.upload.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.application.token.TokenType;
import kr.rilog.domain.upload.controller.dto.request.ImageImportRequest;
import kr.rilog.domain.upload.controller.dto.request.PreSignedUrlCreateRequest;
import kr.rilog.domain.upload.controller.dto.response.ImageImportResponse;
import kr.rilog.domain.upload.controller.dto.response.PresignedUrlCreateResponse;
import kr.rilog.domain.upload.service.ImageImportService;
import kr.rilog.domain.upload.service.UploadService;
import kr.rilog.domain.upload.service.dto.result.ImageImportResult;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;
    private final ImageImportService imageImportService;

    @AuthGuard(value = {TokenType.ACCESS, TokenType.ONBOARDING})
    @PostMapping("/uploads/presigned-url")
    public ApiResponse<PresignedUrlCreateResponse> createPresignedUrl(
            @LoginUserId Long userId,
            @Valid @RequestBody PreSignedUrlCreateRequest request
    ) {
        PresignedUrlCreateResult result = uploadService.createUploadUrl(userId, request.toCommand());

        return ApiResponse.response(
                HttpStatus.OK,
                "PresignedUrl을 정상적으로 발급했습니다",
                PresignedUrlCreateResponse.from(result)
        );
    }

    @AuthGuard(value = {TokenType.ACCESS, TokenType.ONBOARDING})
    @PostMapping("/uploads/image-imports")
    public ApiResponse<ImageImportResponse> importImage(
            @LoginUserId Long userId,
            @Valid @RequestBody ImageImportRequest request
    ) {
        ImageImportResult result = imageImportService.importImage(userId, request.sourceUrl(), request.imagePurpose());

        return ApiResponse.response(
                HttpStatus.OK,
                "외부 이미지를 정상적으로 가져왔습니다",
                ImageImportResponse.from(result)
        );
    }

}
