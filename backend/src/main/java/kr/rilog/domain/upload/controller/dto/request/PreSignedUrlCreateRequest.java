package kr.rilog.domain.upload.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import kr.rilog.domain.upload.domain.enums.UploadType;

public record PreSignedUrlCreateRequest(

        @NotBlank(message = "fileName은 필수입니다.")
        String fileName,

        @Schema(
                description = "파일의 MIME 타입",
                allowableValues = {
                        "image/jpeg", "image/png", "image/webp", "image/gif",
                        "application/pdf", "pdf", "application/zip", "zip", "text/plain", "txt"
                },
                examples = {
                        "image/jpeg", "image/png", "image/webp", "image/gif",
                        "application/pdf", "pdf", "application/zip", "zip", "text/plain", "txt"
                }
        )
        @NotBlank(message = "contentType은 필수입니다.")
        String contentType,

        @Positive
        long size,

        @Schema(
                description = "IMAGE | FILE",
                examples = {"IMAGE", "FILE"}
        )
        @NotNull(message = "type은 필수입니다.")
        UploadType type

) {
}
