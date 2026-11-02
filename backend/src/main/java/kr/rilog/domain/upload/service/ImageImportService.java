package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.domain.upload.service.dto.result.ImageImportResult;
import kr.rilog.domain.upload.service.gateway.ImageImportGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ImageImportService {

    private final ImageImportGateway imageImportGateway;

    public ImageImportResult importImage(Long userId, String sourceUrl, ImagePurpose purpose) {
        return imageImportGateway.importImage(userId, sourceUrl, purpose);
    }

}
