package kr.rilog.domain.upload.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record PresignedUrlCreateResponse(

        @Schema(
                description = "업로드 객체를 식별하기 위한 고유 ID",
                example = "b38e9b2c-4c13-4f52-9c31-0e52d768d517"
        )
        UUID uploadId,

        @Schema(
                description = "S3에 저장될 객체의 Key. 게시글 저장 시 업로드 객체 식별 및 상태 변경에 사용됩니다.",
                example = "rilog/uploads/images/b38e9b2c-4c13-4f52-9c31-0e52d768d517.png"
        )
        String objectKey,

        @Schema(
                description = "클라이언트가 파일을 S3에 직접 업로드할 때 사용하는 Presigned PUT URL",
                example = "https://aws~~/rilog/uploads/images/example.png?X-Amz-Algorithm=AWS4-HMAC-SHA256..."
        )
        String uploadUrl,

        @Schema(
                description = "Presigned URL을 이용한 S3 업로드 요청 시 반드시 함께 전달해야 하는 HTTP 헤더. " +
                        "각 헤더 값은 복수 개일 수 있으므로 배열 형태로 제공됩니다.",
                example = """
                        {
                          "content-type": ["image/png"],
                          "x-amz-tagging": ["status=TEMPORARY"]
                        }
                        """
        )
        Map<String, List<String>> headers,

        @Schema(
                description = "Presigned URL 만료 시각",
                example = "2026-08-14T03:30:00Z"
        )
        Instant expiresAt
) {

    public static PresignedUrlCreateResponse from(PresignedUrlCreateResult result) {
        return new PresignedUrlCreateResponse(
                result.uploadId(),
                result.objectKey(),
                result.uploadUrl(),
                result.headers(),
                result.expiresAt()
        );
    }
}
