package kr.rilog.domain.upload.controller;

import jakarta.validation.Valid;
import kr.rilog.domain.upload.controller.dto.request.PreSignedUrlCreateRequest;
import kr.rilog.domain.upload.controller.dto.response.PresignedUrlCreateResponse;
import kr.rilog.domain.upload.service.UploadService;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
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

    @PostMapping("/uploads/presigned-url")
    public ApiResponse<PresignedUrlCreateResponse> createPresignedUrl(
            @Valid @RequestBody PreSignedUrlCreateRequest request
    ) {
        PresignedUrlCreateCommand command = new PresignedUrlCreateCommand(
                request.fileName(),
                request.contentType(),
                request.size(),
                request.type()
        );

        PresignedUrlCreateResult result = uploadService.createUploadUrl(command);

        return ApiResponse.response(
                HttpStatus.OK,
                "PresignedUrl을 정상적으로 발급했습니다",
                PresignedUrlCreateResponse.from(result)
        );
    }

}
