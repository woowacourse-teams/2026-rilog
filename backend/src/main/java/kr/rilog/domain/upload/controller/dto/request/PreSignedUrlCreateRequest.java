package kr.rilog.domain.upload.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import kr.rilog.domain.upload.domain.UploadType;

public record PreSignedUrlCreateRequest(

        @NotBlank(message = "fileName은 필수입니다.")
        String fileName,

        @Schema(description = "ex image/jpeg")
        @NotBlank(message = "contentType은 필수입니다.")
        String contentType,

        @Positive
        long size,

        @Schema(description = "IMAGE | FILE")
        @NotNull(message = "type은 필수입니다.")
        UploadType type

) {
}
