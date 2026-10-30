package kr.rilog.domain.upload.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.upload.service.dto.result.ImageImportResult;

public record ImageImportResponse(

        @Schema(
                description = "WebP로 변환해 저장한 S3 객체의 Key. presigned 업로드의 objectKey와 같은 방식으로 사용한다.",
                example = "rilog/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.webp"
        )
        String objectKey,

        @Schema(
                description = "저장한 이미지의 조회 URL",
                example = "https://images.example.com/rilog/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.webp"
        )
        String url
) {

    public static ImageImportResponse from(ImageImportResult result) {
        return new ImageImportResponse(result.objectKey(), result.url());
    }
}
