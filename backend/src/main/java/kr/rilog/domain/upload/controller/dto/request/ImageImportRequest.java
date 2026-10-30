package kr.rilog.domain.upload.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.upload.domain.enums.ImagePurpose;

public record ImageImportRequest(

        @Schema(
                description = "가져올 외부 이미지의 HTTPS URL. 정적 JPEG, PNG, WebP만 지원하며 리다이렉트는 따르지 않는다.",
                example = "https://external.example.com/photo.png"
        )
        @NotBlank(message = "sourceUrl은 필수입니다.")
        @Size(max = 4096, message = "sourceUrl은 최대 4096자입니다.")
        String sourceUrl,

        @Schema(
                description = "이미지 목적. PROFILE은 profiles, CONTENT는 images 디렉터리에 저장한다.",
                examples = {"PROFILE", "CONTENT"}
        )
        @NotNull(message = "imagePurpose는 필수입니다.")
        ImagePurpose imagePurpose

) {
}
