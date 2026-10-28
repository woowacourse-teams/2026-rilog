package kr.rilog.domain.upload.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;

public record PreSignedUrlCreateRequest(

        @NotBlank(message = "fileName은 필수입니다.")
        String fileName,

        @Schema(
                description = "파일의 MIME 타입",
                allowableValues = {
                        "image/jpeg", "image/png", "image/webp", "image/gif",
                        "image/avif", "image/svg+xml", "image/heic",
                        "application/pdf", "application/zip", "text/plain",
                        "video/mp4", "video/webm", "video/quicktime",
                        "text/markdown", "application/json", "text/csv"
                },
                examples = {
                        "image/jpeg", "image/png", "image/webp", "image/gif",
                        "image/avif", "image/svg+xml", "image/heic",
                        "application/pdf", "application/zip", "text/plain",
                        "video/mp4", "video/webm", "video/quicktime",
                        "text/markdown", "application/json", "text/csv"
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
        UploadType type,

        @Schema(
                description = "이미지 목적. type이 IMAGE일 때만 사용하고 FILE이면 무시한다. 생략하면 CONTENT로 처리한다.",
                examples = {"PROFILE", "CONTENT"}
        )
        ImagePurpose imagePurpose

) {

    public PresignedUrlCreateCommand toCommand() {
        return new PresignedUrlCreateCommand(fileName, contentType, size, type, imagePurpose);
    }
}
