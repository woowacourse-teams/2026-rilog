package kr.rilog.domain.upload.service.dto.result;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record CompactUploadUrlResult(
        int width,
        String objectKey,
        String uploadUrl,
        Map<String, List<String>> headers,
        Instant expiresAt
) {
}
