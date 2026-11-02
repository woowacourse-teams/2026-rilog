package kr.rilog.domain.upload.controller.dto.response;

import kr.rilog.domain.upload.service.dto.result.CompactUploadUrlResult;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ImageCompactionUploadUrlResponse(
        List<Upload> uploads
) {

    public static ImageCompactionUploadUrlResponse from(List<CompactUploadUrlResult> results) {
        return new ImageCompactionUploadUrlResponse(
                results.stream()
                        .map(Upload::from)
                        .toList()
        );
    }

    public record Upload(
            int width,
            String objectKey,
            String uploadUrl,
            Map<String, List<String>> headers,
            Instant expiresAt
    ) {

        private static Upload from(CompactUploadUrlResult result) {
            return new Upload(
                    result.width(),
                    result.objectKey(),
                    result.uploadUrl(),
                    result.headers(),
                    result.expiresAt()
            );
        }
    }
}
