package kr.rilog.domain.upload.service.gateway;

import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.domain.upload.exception.ImageImportErrorInformation;
import kr.rilog.domain.upload.service.dto.result.ImageImportResult;

/**
 * 외부 이미지를 Rilog 저장소에 다시 올린다. 저장 위치는 사용자와 목적별 원본 경로다.
 *
 * <p>사용자가 고칠 수 있는 실패는 {@link ImageImportErrorInformation}의 UploadException으로, 그 밖의 실패는
 * {@link ImageImportErrorInformation#IMAGE_IMPORT_UNAVAILABLE}의 RilogInfrastructureException으로 던진다.
 */
public interface ImageImportGateway {

    ImageImportResult importImage(Long userId, String sourceUrl, ImagePurpose purpose);

}
